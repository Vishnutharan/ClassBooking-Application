using ClassBooking.API.Models;
using ClassBooking.API.Services;
using ClassBooking.API.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClassBooking.API.Controllers
{
    [Authorize]
    [Route("api/teacher")]
    [ApiController]
    public class TeacherManagementController : ControllerBase
    {
        private readonly ITeacherService _teacherService;
        private readonly ITeacherRepository _teacherRepository;
        private readonly IMessageService _messageService;
        private readonly IAnnouncementService _announcementService;
        private readonly IAttendanceService _attendanceService;
        private readonly ILessonPlanService _lessonPlanService;
        private readonly IAnalyticsService _analyticsService;
        private readonly IUserRepository _userRepository;
        private readonly IStudentService _studentService;
        private readonly IBookingService _bookingService;
        private readonly ILogger<TeacherManagementController> _logger;

        public TeacherManagementController(
            ITeacherService teacherService, 
            ITeacherRepository teacherRepository,
            IMessageService messageService,
            IAnnouncementService announcementService,
            IAttendanceService attendanceService,
            ILessonPlanService lessonPlanService,
            IAnalyticsService analyticsService,
            IUserRepository userRepository,
            IStudentService studentService,
            IBookingService bookingService,
            ILogger<TeacherManagementController> logger)
        {
            _teacherService = teacherService;
            _teacherRepository = teacherRepository;
            _messageService = messageService;
            _announcementService = announcementService;
            _attendanceService = attendanceService;
            _lessonPlanService = lessonPlanService;
            _analyticsService = analyticsService;
            _userRepository = userRepository;
            _studentService = studentService;
            _bookingService = bookingService;
            _logger = logger;
        }

        // Profile Management
        [HttpGet("profile")]
        public async Task<ActionResult<TeacherProfile>> GetMyProfile()
        {
            // Log all claims for debugging
            _logger.LogInformation("=== GetMyProfile Debug Info ===");
            foreach (var claim in User.Claims)
            {
                _logger.LogInformation($"Claim: {claim.Type} = {claim.Value}");
            }

            var userId = ExtractUserId();

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogError("UserId is null or empty. User is not properly authenticated.");
                return Unauthorized(new { message = "User ID not found in token" });
            }

            var teacher = await EnsureTeacherProfile(userId);
            if (teacher == null)
            {
                _logger.LogError($"Teacher profile creation failed for userId: {userId}");
                return StatusCode(500, new { message = "Failed to create teacher profile" });
            }

            return Ok(teacher);
        }
        [HttpPut("profile")]
        public async Task<ActionResult<TeacherProfile>> UpdateProfile([FromBody] UpdateTeacherProfileRequest request)
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var teacher = await EnsureTeacherProfile(userId);
            if (teacher == null)
                return NotFound("Teacher profile not found");

            var updates = new TeacherProfile
            {
                Bio = request.Bio,
                HourlyRate = request.HourlyRate ?? teacher.HourlyRate,
                ExperienceYears = request.ExperienceYears ?? teacher.ExperienceYears,
                IsAvailable = request.IsAvailable ?? teacher.IsAvailable,
                ProfilePicture = request.ProfilePicture
            };

            var updated = await _teacherService.UpdateTeacherProfileAsync(teacher.Id, updates);
            return Ok(updated);
        }

        // Subject Management
        [HttpPost("profile/picture")]
        public async Task<ActionResult> UploadProfilePicture([FromForm] IFormFile file)
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var teacher = await EnsureTeacherProfile(userId);
            if (teacher == null)
                return NotFound("Teacher profile not found");

            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded");

            // Ensure uploads directory exists
            var uploadsPath = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            if (!System.IO.Directory.Exists(uploadsPath))
                System.IO.Directory.CreateDirectory(uploadsPath);

            var fileName = $"{teacher.Id}_{Guid.NewGuid()}{System.IO.Path.GetExtension(file.FileName)}";
            var filePath = System.IO.Path.Combine(uploadsPath, fileName);

            using (var stream = new System.IO.FileStream(filePath, System.IO.FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Generate URL
            var request = HttpContext.Request;
            var baseUrl = $"{request.Scheme}://{request.Host}";
            var fileUrl = $"{baseUrl}/uploads/{fileName}";

            // Update Teacher Profile
            await _teacherService.UpdateTeacherProfileAsync(teacher.Id, new TeacherProfile { ProfilePicture = fileUrl });

            return Ok(new { url = fileUrl });
        }

        [HttpPost("profile/subjects")]
        public async Task<ActionResult<TeacherSubject>> AddSubject([FromBody] TeacherSubject subject)
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var teacher = await EnsureTeacherProfile(userId);
            if (teacher == null)
                return NotFound("Teacher profile not found");

            var added = await _teacherService.AddSubjectAsync(teacher.Id, subject);
            return Ok(added);
        }

        [HttpDelete("profile/subjects/{subjectId}")]
        public async Task<ActionResult> RemoveSubject(string subjectId)
        {
            var userId = User.FindFirst("userId")?.Value;
            var teacher = userId == null ? null : await EnsureTeacherProfile(userId);
            if (teacher == null) return Unauthorized();
            if (!(await _teacherRepository.GetTeacherSubjectsAsync(teacher.Id)).Any(s => s.Id == subjectId))
                return NotFound("Subject not found");
            var result = await _teacherService.RemoveSubjectAsync(subjectId);
            if (!result)
                return NotFound("Subject not found");

            return Ok();
        }

        // Availability Management
        [HttpPut("profile/availability")]
        public async Task<ActionResult> UpdateAvailability([FromBody] List<TeacherAvailability> availability)
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var teacher = await EnsureTeacherProfile(userId);
            if (teacher == null)
                return NotFound("Teacher profile not found");

            await _teacherService.UpdateAvailabilityAsync(teacher.Id, availability);
            return Ok();
        }

        [HttpGet("availability/slots")]
        public async Task<ActionResult> GetAvailabilitySlots([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var teacher = await EnsureTeacherProfile(userId);
            if (teacher == null)
                return NotFound("Teacher profile not found");

            var slots = await _teacherService.GetAvailabilitySlotsAsync(teacher.Id, startDate, endDate);
            return Ok(slots);
        }

        [HttpPost("availability/slots")]
        public async Task<ActionResult> AddAvailabilitySlot([FromBody] AvailabilitySlotRequest request)
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var teacher = await EnsureTeacherProfile(userId);
            if (teacher == null)
                return NotFound("Teacher profile not found");

            if (!TimeOnly.TryParse(request.StartTime, out var start) || !TimeOnly.TryParse(request.EndTime, out var end) || end <= start || request.Date.Date.Add(start.ToTimeSpan()) <= DateTime.UtcNow)
                return BadRequest(new { message = "Choose a future date and an end time after the start time." });
            request.StartTime = start.ToString("HH:mm");
            request.EndTime = end.ToString("HH:mm");
            var slots = await _teacherService.GetAvailabilitySlotsAsync(teacher.Id, request.Date.Date, request.Date.Date);
            if (slots.Any(s => TimeOnly.Parse(s.StartTime) < end && start < TimeOnly.Parse(s.EndTime)))
                return Conflict(new { message = "This time overlaps an existing slot." });

            var existing = await _teacherService.FindAvailabilitySlotAsync(teacher.Id, request.Date, request.StartTime, request.EndTime);
            if (existing != null)
                return Conflict("Slot already exists");

            var slot = await _teacherService.AddAvailabilitySlotAsync(teacher.Id, request.Date, request.StartTime, request.EndTime);
            return Ok(slot);
        }

        [HttpDelete("availability/slots/{slotId}")]
        public async Task<ActionResult> DeleteAvailabilitySlot(string slotId)
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var teacher = await EnsureTeacherProfile(userId);
            if (teacher == null)
                return NotFound("Teacher profile not found");

            var deleted = await _teacherService.DeleteAvailabilitySlotAsync(slotId, teacher.Id);
            if (!deleted)
                return BadRequest("Unable to delete slot. It may be locked by a booking or does not exist.");

            var students = await _teacherRepository.GetTeacherStudentsAsync(teacher.Id);
            return Ok(students);
        }

        [HttpGet("students")]
        public async Task<ActionResult> GetMyStudents()
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var teacher = await EnsureTeacherProfile(userId);
            if (teacher == null)
            {
                // Fallback: avoid 404 to keep UI usable, return empty list with hint
                return Ok(Array.Empty<object>());
            }

            var students = await _teacherRepository.GetTeacherStudentsAsync(teacher.Id);
            return Ok(students);
        }

        [HttpGet("students/{studentId}/progress")]
        public async Task<ActionResult> GetStudentProgress(string studentId)
        {
            if (!User.IsInRole("Teacher")) return Forbid();
            var userId = User.FindFirst("userId")?.Value;
            var teacher = userId == null ? null : await _teacherService.GetTeacherByUserIdAsync(userId);
            if (teacher == null) return NotFound("Teacher profile not found");
            var bookings = await _bookingService.GetBookingsForTeacherAsync(teacher.Id);
            var student = await _userRepository.GetByIdAsync(studentId);
            if (student == null || !bookings.Any(b => b.StudentId == student.Id && (b.Status == "Confirmed" || b.Status == "Completed")))
                return NotFound("No active student relationship found");
            var progress = await _studentService.GetProgressAsync(student.Id);
            return Ok(new { studentId, overallProgress = progress.Count > 0 ? progress.Average(p => p.AverageScore) : 0,
                subjects = progress.Select(p => new { name = p.Subject, score = p.AverageScore, totalClasses = p.TotalClasses, studyHours = p.StudyHours }) });
        }

        // Attendance
        [HttpGet("attendance")]
        public async Task<ActionResult> GetAttendanceRecords([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var teacher = await EnsureTeacherProfile(userId);
            if (teacher == null)
                return NotFound("Teacher profile not found");

            var records = await _attendanceService.GetRecordsAsync(teacher.Id, startDate, endDate);
            return Ok(records);
        }

        [HttpPost("attendance")]
        public async Task<ActionResult> MarkAttendance([FromBody] List<AttendanceRecordRequest> records)
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var teacher = await EnsureTeacherProfile(userId);
            if (teacher == null)
                return NotFound("Teacher profile not found");

            var bookings = await _bookingService.GetBookingsForTeacherAsync(teacher.Id);
            var allowedStatuses = new[] { "Present", "Absent", "Late", "Excused" };
            if (records.Count == 0 || records.Any(r => !allowedStatuses.Contains(r.Status) || r.ClassDate.Date > DateTime.UtcNow.Date ||
                !bookings.Any(b => b.Id == r.ClassId && b.StudentId == r.StudentId && b.Date.Date == r.ClassDate.Date && b.Status == "Completed")))
                return BadRequest(new { message = "Attendance must reference a completed class for this teacher and use a valid status." });

            var entities = records.Select(r => new Entities.AttendanceRecordEntity
            {
                TeacherProfileId = teacher.Id,
                StudentId = r.StudentId,
                ClassId = r.ClassId,
                ClassDate = r.ClassDate,
                Status = r.Status,
                Notes = r.Notes,
                Subject = r.Subject
            }).ToList();

            var result = await _attendanceService.MarkAttendanceAsync(entities);
            return Ok(result);
        }

        // Lesson Plans
        [HttpGet("lesson-plans")]
        public async Task<ActionResult> GetLessonPlans()
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var teacher = await _teacherService.GetTeacherByUserIdAsync(userId);
            if (teacher == null)
                return NotFound("Teacher profile not found");

            var plans = await _lessonPlanService.GetByTeacherAsync(teacher.Id);
            return Ok(plans);
        }

        [HttpPost("lesson-plans")]
        public async Task<ActionResult> CreateLessonPlan([FromBody] LessonPlanRequest request)
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var teacher = await _teacherService.GetTeacherByUserIdAsync(userId);
            if (teacher == null)
                return NotFound("Teacher profile not found");

            var entity = new Entities.LessonPlanEntity
            {
                Title = request.Title,
                Subject = request.Subject,
                Level = request.Level,
                ScheduledDate = request.ScheduledDate,
                Description = request.Description,
                LearningObjectives = request.LearningObjectives,
                Materials = request.Materials,
                Activities = request.Activities,
                Assessment = request.Assessment,
                Homework = request.Homework,
                DurationMinutes = request.DurationMinutes,
                Status = request.Status ?? "Draft"
            };

            var created = await _lessonPlanService.CreateAsync(teacher.Id, entity);
            return Ok(created);
        }

        [HttpPut("lesson-plans/{id}")]
        public async Task<ActionResult> UpdateLessonPlan(string id, [FromBody] LessonPlanRequest request)
        {
            var entity = new Entities.LessonPlanEntity
            {
                Title = request.Title,
                Subject = request.Subject,
                Level = request.Level,
                ScheduledDate = request.ScheduledDate,
                Description = request.Description,
                LearningObjectives = request.LearningObjectives,
                Materials = request.Materials,
                Activities = request.Activities,
                Assessment = request.Assessment,
                Homework = request.Homework,
                DurationMinutes = request.DurationMinutes,
                Status = request.Status ?? "Draft"
            };

            var updated = await _lessonPlanService.UpdateAsync(id, entity);
            if (updated == null)
                return NotFound("Lesson plan not found");
            return Ok(updated);
        }

        [HttpDelete("lesson-plans/{id}")]
        public async Task<ActionResult> DeleteLessonPlan(string id)
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            var teacher = userId == null ? null : await _teacherService.GetTeacherByUserIdAsync(userId);
            var plan = await _lessonPlanService.GetByIdAsync(id);
            if (teacher == null || plan == null || plan.TeacherProfileId != teacher.Id)
                return NotFound("Lesson plan not found");
            var result = await _lessonPlanService.DeleteAsync(id);
            if (!result)
                return NotFound("Lesson plan not found");

            return Ok(true);
        }

        // Analytics
        [HttpGet("analytics")]
        public async Task<ActionResult> GetAnalytics([FromQuery] string period = "monthly")
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var teacher = await _teacherService.GetTeacherByUserIdAsync(userId);
            if (teacher == null)
                return NotFound("Teacher profile not found");

            var analytics = await _analyticsService.GetTeacherAnalyticsAsync(teacher.Id, period);
            return Ok(analytics);
        }

        [HttpGet("analytics/earnings")]
        public async Task<ActionResult> GetEarningsAnalytics([FromQuery] string period = "monthly")
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var teacher = await _teacherService.GetTeacherByUserIdAsync(userId);
            if (teacher == null)
                return NotFound("Teacher profile not found");

            var earnings = await _analyticsService.GetEarningsAnalyticsAsync(teacher.Id, period);
            return Ok(earnings);
        }

        [HttpGet("analytics/subjects")]
        public async Task<ActionResult> GetSubjectPerformance()
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var teacher = await _teacherService.GetTeacherByUserIdAsync(userId);
            if (teacher == null)
                return NotFound("Teacher profile not found");

            var performance = await _analyticsService.GetSubjectPerformanceAsync(teacher.Id);
            return Ok(performance);
        }

        // Communication
        [HttpGet("communication/conversations")]
        public async Task<ActionResult> GetConversations()
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var conversations = await _messageService.GetConversationsAsync(userId);
            return Ok(conversations);
        }

        [HttpGet("communication/announcements")]
        public async Task<ActionResult> GetAnnouncements()
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var teacher = await _teacherService.GetTeacherByUserIdAsync(userId);
            if (teacher == null) return NotFound("Teacher profile not found");

            var announcements = await _announcementService.GetAnnouncementsAsync(teacher.Id);
            return Ok(announcements);
        }

        [HttpPost("communication/messages")]
        public async Task<ActionResult> SendMessage([FromBody] MessageRequest request)
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            var userName = User.FindFirst("fullName")?.Value ?? "User";
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var message = await _messageService.SendMessageAsync(request.ConversationId, userId, userName, request.Content);
            return Ok(message);
        }

        [HttpGet("communication/conversations/{conversationId}/messages")]
        public async Task<ActionResult> GetMessages(string conversationId)
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            try { return Ok(await _messageService.GetMessagesAsync(conversationId, userId)); }
            catch (UnauthorizedAccessException) { return NotFound(); }
        }

        [HttpPost("communication/conversations/{conversationId}/read")]
        public async Task<IActionResult> MarkConversationRead(string conversationId)
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            try { await _messageService.MarkAsReadAsync(conversationId, userId); return NoContent(); }
            catch (UnauthorizedAccessException) { return NotFound(); }
        }

        [HttpPost("communication/announcements")]
        public async Task<ActionResult> CreateAnnouncement([FromBody] AnnouncementRequest request)
        {
            var userId = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var teacher = await _teacherService.GetTeacherByUserIdAsync(userId);
            if (teacher == null) return NotFound("Teacher profile not found");

            var announcement = await _announcementService.CreateAnnouncementAsync(
                teacher.Id, 
                request.Title, 
                request.Content, 
                request.TargetAudience);
                
            return Ok(announcement);
        }

        // Helper methods (controller scope)
        private string? ExtractUserId()
        {
            return User.FindFirst("userId")?.Value
                ?? User.FindFirst("sub")?.Value
                ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
        }

        private async Task<TeacherProfile?> EnsureTeacherProfile(string userId)
        {
            var existing = await _teacherService.GetTeacherByUserIdAsync(userId);
            if (existing != null) return existing;

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return null;
            if (!string.Equals(user.Role, "Teacher", StringComparison.OrdinalIgnoreCase)) return null;

            var newProfile = new Entities.TeacherProfileEntity
            {
                UserId = userId,
                FullName = user.FullName ?? "Unknown",
                Email = user.Email ?? "",
                PhoneNumber = user.PhoneNumber ?? "",
                HourlyRate = 0,
                ExperienceYears = 0,
                AverageRating = 0,
                TotalReviews = 0,
                TotalClasses = 0,
                IsAvailable = true,
                VerificationStatus = "Pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _teacherRepository.CreateTeacherAsync(newProfile);
            return await _teacherService.GetTeacherByUserIdAsync(userId);
        }
    }

    // Request DTOs
    public class UpdateTeacherProfileRequest
    {
        public string? Bio { get; set; }
        public decimal? HourlyRate { get; set; }
        public int? ExperienceYears { get; set; }
        public bool? IsAvailable { get; set; }
        public string? ProfilePicture { get; set; }
    }

    public class AttendanceRecordRequest
    {
        public string StudentId { get; set; } = string.Empty;
        public string ClassId { get; set; } = string.Empty;
        public DateTime ClassDate { get; set; }
        public string Status { get; set; } = "Present";
        public string? Notes { get; set; }
        public string? Subject { get; set; }
    }

    public class LessonPlanRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public DateTime ScheduledDate { get; set; }
        public string? Description { get; set; }
        public string? LearningObjectives { get; set; }
        public string? Materials { get; set; }
        public string? Activities { get; set; }
        public string? Assessment { get; set; }
        public string? Homework { get; set; }
        public int DurationMinutes { get; set; }
        public string? Status { get; set; }
    }

    public class MessageRequest
    {
        public string ConversationId { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }

    public class AnnouncementRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string TargetAudience { get; set; } = "All";
    }

    public class AvailabilitySlotRequest
    {
        public DateTime Date { get; set; }
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
    }
}
