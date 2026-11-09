using ClassBooking.API.Entities;
using ClassBooking.API.Models;
using ClassBooking.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ClassBooking.API.Repositories;

namespace ClassBooking.API.Controllers
{
    [Authorize]
    [Route("api/resources")]
    [ApiController]
    public class ResourceController : ControllerBase
    {
        private readonly IResourceService _resourceService;
        private readonly ITeacherService _teacherService;
        private readonly IStudentService _studentService;
        private readonly IResourceRepository _resources;

        public ResourceController(IResourceService resourceService, ITeacherService teacherService, IStudentService studentService, IResourceRepository resources)
        {
            _resourceService = resourceService;
            _teacherService = teacherService;
            _studentService = studentService;
            _resources = resources;
        }

        [HttpPost("upload")]
        [Authorize(Roles = "Teacher")]
        public async Task<ActionResult<ResourceEntity>> UploadResource([FromForm] UploadResourceRequest request)
        {
            var logger = HttpContext.RequestServices.GetRequiredService<ILogger<ResourceController>>();
            logger.LogInformation("Attempting to upload resource...");

            var claims = User.Claims.Select(c => $"{c.Type}: {c.Value}").ToList();
            logger.LogInformation("User Claims: {Claims}", string.Join(", ", claims));

            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            logger.LogInformation("Resolved UserId: {UserId}", userId);
            
            if (string.IsNullOrEmpty(userId)) 
            {
                logger.LogWarning("UserId claim not found. Returning Unauthorized.");
                return Unauthorized();
            }

            var teacher = await _teacherService.GetTeacherByUserIdAsync(userId);
            if (teacher == null)
                return NotFound("Teacher profile not found");

            if (request.File == null || request.File.Length == 0)
                return BadRequest("No file uploaded");
            var extension = Path.GetExtension(request.File.FileName).ToLowerInvariant();
            if (request.File.Length > 20 * 1024 * 1024 || !new[] { ".pdf", ".png", ".jpg", ".jpeg", ".mp4", ".docx", ".pptx", ".txt" }.Contains(extension))
                return BadRequest(new { message = "Use a supported document, image or video up to 20 MB." });

            // Save file
            var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "resources");
            if (!Directory.Exists(uploadsPath))
                Directory.CreateDirectory(uploadsPath);

            var fileName = $"{Guid.NewGuid()}_{Path.GetFileName(request.File.FileName)}"; // Using Guid to prevent collisions
            var filePath = Path.Combine(uploadsPath, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await request.File.CopyToAsync(stream);
            }

            var requestReq = HttpContext.Request;
            var baseUrl = $"{requestReq.Scheme}://{requestReq.Host}";
            var fileUrl = $"{baseUrl}/uploads/resources/{fileName}";

            var resource = new ResourceEntity
            {
                TeacherProfileId = teacher.Id,
                Title = request.Title,
                Description = request.Description,
                Subject = request.Subject,
                Level = request.Level,
                Type = GetResourceType(request.File.ContentType),
                FileName = request.File.FileName,
                FilePath = fileUrl, // Storing URL as FilePath for easier frontend access, or standard path
                FileSize = request.File.Length,
                MimeType = request.File.ContentType,
                StudentId = request.StudentId,
                IsPublic = string.IsNullOrEmpty(request.StudentId) // If no student specified, it's public (or general)
            };

            var createdResource = await _resourceService.UploadResourceAsync(resource);
            return CreatedAtAction(nameof(GetResource), new { id = createdResource.Id }, createdResource);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ResourceEntity>> GetResource(string id)
        {
            var resource = await _resources.GetByIdAsync(id);
            if (resource == null) return NotFound();
            if (!await CanAccess(resource)) return Forbid();
            return Ok(resource);
        }

        [HttpGet("teacher")]
        [Authorize(Roles = "Teacher")]
        public async Task<ActionResult<List<ResourceEntity>>> GetTeacherResources()
        {
            var logger = HttpContext.RequestServices.GetRequiredService<ILogger<ResourceController>>();
            logger.LogInformation("Entering GetTeacherResources...");
            
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) 
            {
                 logger.LogWarning("GetTeacherResources: UserId not found in claims.");
                 return Unauthorized();
            }

            var teacher = await _teacherService.GetTeacherByUserIdAsync(userId);
            if (teacher == null) return NotFound("Teacher profile not found");

            var resources = await _resourceService.GetTeacherResourcesAsync(teacher.Id);
            return Ok(resources);
        }

        [HttpGet("student")]
        [Authorize(Roles = "Student")]
        public async Task<ActionResult<List<ResourceEntity>>> GetStudentResources()
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var studentProfile = await _studentService.GetProfileAsync(userId);
            if (studentProfile == null)
                return NotFound("Student profile not found");

            var resources = await _resourceService.GetStudentResourcesAsync(studentProfile.Id);
            return Ok(resources);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Teacher")]
        public async Task<ActionResult> DeleteResource(string id)
        {
             var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
             var resource = await _resources.GetByIdAsync(id);
             if (resource == null) return NotFound();
             var teacher = await _teacherService.GetTeacherByUserIdAsync(userId!);
             if (teacher == null || teacher.Id != resource.TeacherProfileId) return Forbid();
             await _resourceService.DeleteResourceAsync(id);
             return NoContent();
        }

        private async Task<bool> CanAccess(ResourceEntity resource)
        {
            if (resource.IsPublic || User.IsInRole("Admin")) return true;
            var userId = User.FindFirst("userId")!.Value;
            if (User.IsInRole("Teacher"))
                return (await _teacherService.GetTeacherByUserIdAsync(userId))?.Id == resource.TeacherProfileId;
            var student = await _studentService.GetProfileAsync(userId);
            return resource.StudentId == userId || (student != null && resource.StudentId == student.Id);
        }

        private string GetResourceType(string mimeType)
        {
            if (mimeType.StartsWith("image/")) return "Image";
            if (mimeType.StartsWith("video/")) return "Video";
            if (mimeType == "application/pdf") return "PDF";
            return "Document";
        }
    }
}
