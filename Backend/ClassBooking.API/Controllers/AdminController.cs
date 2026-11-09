using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ClassBooking.API.Models.Dto;
using ClassBooking.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClassBooking.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;

        private readonly ITimetableService _timetableService;
        private readonly AdminReportExportService _reportExporter;

        public AdminController(IAdminService adminService, ITimetableService timetableService, AdminReportExportService reportExporter)
        {
            _adminService = adminService;
            _timetableService = timetableService;
            _reportExporter = reportExporter;
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 100)
        {
            if (page < 1 || pageSize < 1 || pageSize > 200) return BadRequest(new { message = "Page must be positive and page size must be between 1 and 200." });
            var users = await _adminService.GetAllUsersAsync();
            var paged = users.Skip((page - 1) * pageSize).Take(pageSize).ToList();
            return Ok(new { users = paged, total = users.Count });
        }

        [HttpGet("users/{id}")]
        public async Task<IActionResult> GetUserById(string id)
        {
            var user = await _adminService.GetUserByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "User not found" });
            
            return Ok(user);
        }

        [HttpGet("users/role/{role}")]
        public async Task<IActionResult> GetUsersByRole(string role)
        {
            var users = await _adminService.GetUsersByRoleAsync(role);
            return Ok(users);
        }

        [HttpPost("users")]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var user = await _adminService.CreateUserAsync(request);
                return Ok(user);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("users/{id}")]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            request.Id = id;
            try
            {
                var user = await _adminService.UpdateUserAsync(request);
                return Ok(user);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("users/{id}/suspend")]
        public async Task<IActionResult> SuspendUser(string id, [FromBody] SuspendUserRequest request)
        {
            var result = await _adminService.SuspendUserAsync(id, request.Reason ?? "Suspended by admin");
            if (!result) return NotFound(new { message = "User not found" });
            return Ok(new { message = "User suspended" });
        }

        [HttpPost("users/{id}/activate")]
        public async Task<IActionResult> ActivateUser(string id)
        {
            var result = await _adminService.ActivateUserAsync(id);
            if (!result) return NotFound(new { message = "User not found" });
            return Ok(new { message = "User activated" });
        }

        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var result = await _adminService.DeleteUserAsync(id);
            if (!result)
                return NotFound(new { message = "User not found" });

            return Ok(new { message = "User deleted successfully" });
        }

        [HttpGet("users/search")]
        public async Task<IActionResult> SearchUsers([FromQuery] string query)
        {
            var results = await _adminService.SearchUsersAsync(query ?? string.Empty);
            return Ok(results);
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetSystemStats()
        {
            var stats = await _adminService.GetSystemStatsAsync();
            return Ok(stats);
        }

        [HttpGet("stats/dashboard")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var stats = await _adminService.GetDashboardStatsAsync();
            return Ok(stats);
        }

        [HttpGet("stats/users")]
        public async Task<IActionResult> GetUserStats([FromQuery] string period = "monthly")
        {
            var stats = await _adminService.GetUserStatsAsync(period);
            return Ok(stats);
        }

        [HttpGet("stats/bookings")]
        public async Task<IActionResult> GetBookingStats([FromQuery] string period = "monthly")
        {
            var stats = await _adminService.GetBookingStatsAsync(period);
            return Ok(stats);
        }

        [HttpGet("stats/revenue")]
        public async Task<IActionResult> GetRevenueStats([FromQuery] string period = "monthly")
        {
            var stats = await _adminService.GetRevenueStatsAsync(period);
            return Ok(stats);
        }

        [HttpGet("stats/teacher-performance")]
        public async Task<IActionResult> GetTeacherPerformance()
        {
            var stats = await _adminService.GetTeacherPerformanceStatsAsync();
            return Ok(stats);
        }

        // Review management
        [HttpGet("reviews")]
        public async Task<IActionResult> GetAllReviews()
        {
            var reviews = await _adminService.GetAllReviewsAsync();
            var shaped = reviews.Select(r => new
            {
                id = r.Id,
                teacherId = r.TeacherProfileId,
                teacherName = r.TeacherProfile?.FullName ?? "Unknown",
                studentId = r.StudentId,
                studentName = r.StudentName,
                rating = r.Rating,
                comment = r.Comment,
                createdAt = r.CreatedAt
            });

            return Ok(shaped);
        }

        [HttpPut("reviews/{id}")]
        public async Task<IActionResult> UpdateReview(string id, [FromBody] AdminUpdateReviewRequest request)
        {
            if (request == null) return BadRequest(new { message = "Invalid request" });

            var review = await _adminService.UpdateReviewAsync(id, request.Rating, request.Comment ?? string.Empty);
            if (review == null) return NotFound(new { message = "Review not found" });

            return Ok(new { message = "Review updated", review });
        }

        [HttpDelete("reviews/{id}")]
        public async Task<IActionResult> DeleteReview(string id)
        {
            var deleted = await _adminService.DeleteReviewAsync(id);
            if (!deleted) return NotFound(new { message = "Review not found" });

            return Ok(new { message = "Review deleted" });
        }

        [HttpGet("reports/bookings")]
        public async Task<IActionResult> ExportBookingReport([FromQuery] string format = "pdf")
        {
            var report = await _reportExporter.ExportAsync("bookings", format);
            await _adminService.CreateReportHistoryAsync("Booking Report", report.Extension, User.FindFirst("userId")?.Value ?? "Admin");
            return File(report.Content, report.ContentType, $"bookings-report-{DateTime.UtcNow:yyyyMMdd}.{report.Extension}");
        }

        [HttpGet("reports/users")]
        public async Task<IActionResult> ExportUserReport([FromQuery] string format = "pdf")
        {
            var report = await _reportExporter.ExportAsync("users", format);
            await _adminService.CreateReportHistoryAsync("User Report", report.Extension, User.FindFirst("userId")?.Value ?? "Admin");
            return File(report.Content, report.ContentType, $"users-report-{DateTime.UtcNow:yyyyMMdd}.{report.Extension}");
        }

        [HttpGet("reports/revenue")]
        public async Task<IActionResult> ExportRevenueReport([FromQuery] string format = "pdf")
        {
            var report = await _reportExporter.ExportAsync("revenue", format);
            await _adminService.CreateReportHistoryAsync("Revenue Report", report.Extension, User.FindFirst("userId")?.Value ?? "Admin");
            return File(report.Content, report.ContentType, $"revenue-report-{DateTime.UtcNow:yyyyMMdd}.{report.Extension}");
        }

        // Placeholder endpoints for features to be implemented later
        [HttpGet("timetable")]
        public async Task<IActionResult> GetTimetable([FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
        {
            var events = await _timetableService.GetEventsAsync(from, to);
            return Ok(events);
        }

        [HttpPost("timetable")]
        public async Task<IActionResult> CreateTimetableEvent([FromBody] TimetableEventDto eventDto)
        {
            var created = await _timetableService.CreateAsync(eventDto, User.FindFirst("userId")?.Value ?? "admin");
            return Ok(created);
        }

        [HttpPut("timetable/{id}")]
        public async Task<IActionResult> UpdateTimetableEvent(string id, [FromBody] TimetableEventDto eventDto)
        {
            var updated = await _timetableService.UpdateAsync(id, eventDto);
            if (updated == null) return NotFound(new { message = "Event not found" });
            return Ok(updated);
        }

        [HttpDelete("timetable/{id}")]
        public async Task<IActionResult> DeleteTimetableEvent(string id)
        {
            var deleted = await _timetableService.DeleteAsync(id);
            if (!deleted) return NotFound(new { message = "Event not found" });
            return Ok(new { message = "Event deleted" });
        }

        // Holidays CRUD
        [HttpGet("holidays")]
        public async Task<IActionResult> GetHolidays()
        {
            var events = await _timetableService.GetEventsAsync();
            var holidays = events
                .Where(e => string.Equals(e.Type, "Holiday", StringComparison.OrdinalIgnoreCase))
                .Select(e => new PublicHolidayDto
                {
                    Id = e.Id,
                    Name = e.Title,
                    Date = e.Date,
                    Description = e.Description
                });
            return Ok(holidays);
        }

        [HttpPost("holidays")]
        public async Task<IActionResult> CreateHoliday([FromBody] PublicHolidayDto dto)
        {
            var created = await _timetableService.CreateAsync(new TimetableEventDto
            {
                Title = dto.Name,
                Description = dto.Description,
                Date = dto.Date,
                StartTime = "00:00",
                EndTime = "23:59",
                Type = "Holiday",
                Audience = "All"
            }, User.FindFirst("userId")?.Value ?? "admin");

            return Ok(new PublicHolidayDto
            {
                Id = created.Id,
                Name = created.Title,
                Date = created.Date,
                Description = created.Description
            });
        }

        [HttpPut("holidays/{id}")]
        public async Task<IActionResult> UpdateHoliday(string id, [FromBody] PublicHolidayDto dto)
        {
            var updated = await _timetableService.UpdateAsync(id, new TimetableEventDto
            {
                Title = dto.Name,
                Description = dto.Description,
                Date = dto.Date,
                StartTime = "00:00",
                EndTime = "23:59",
                Type = "Holiday",
                Audience = "All"
            });

            if (updated == null) return NotFound(new { message = "Holiday not found" });

            return Ok(new PublicHolidayDto
            {
                Id = updated.Id,
                Name = updated.Title,
                Date = updated.Date,
                Description = updated.Description
            });
        }

        [HttpDelete("holidays/{id}")]
        public async Task<IActionResult> DeleteHoliday(string id)
        {
            var deleted = await _timetableService.DeleteAsync(id);
            if (!deleted) return NotFound(new { message = "Holiday not found" });
            return Ok(new { message = "Holiday deleted" });
        }

        // Exam Seasons CRUD
        [HttpGet("exam-seasons")]
        public async Task<IActionResult> GetExamSeasons()
        {
            var events = await _timetableService.GetEventsAsync();
            var exams = events
                .Where(e => string.Equals(e.Type, "Exam", StringComparison.OrdinalIgnoreCase))
                .Select(e => new ExamSeasonDto
                {
                    Id = e.Id,
                    Name = e.Title,
                    StartDate = e.Date,
                    EndDate = e.Date,
                    ExamType = e.Audience ?? "Exam",
                    Description = e.Description
                });
            return Ok(exams);
        }

        [HttpPost("exam-seasons")]
        public async Task<IActionResult> CreateExamSeason([FromBody] ExamSeasonDto dto)
        {
            var created = await _timetableService.CreateAsync(new TimetableEventDto
            {
                Title = dto.Name,
                Description = dto.Description,
                Date = dto.StartDate,
                StartTime = "09:00",
                EndTime = "17:00",
                Type = "Exam",
                Audience = "Students"
            }, User.FindFirst("userId")?.Value ?? "admin");

            return Ok(new ExamSeasonDto
            {
                Id = created.Id,
                Name = created.Title,
                StartDate = created.Date,
                EndDate = created.Date,
                ExamType = created.Audience ?? "Exam",
                Description = created.Description
            });
        }

        [HttpPut("exam-seasons/{id}")]
        public async Task<IActionResult> UpdateExamSeason(string id, [FromBody] ExamSeasonDto dto)
        {
            var updated = await _timetableService.UpdateAsync(id, new TimetableEventDto
            {
                Title = dto.Name,
                Description = dto.Description,
                Date = dto.StartDate,
                StartTime = "09:00",
                EndTime = "17:00",
                Type = "Exam",
                Audience = "Students"
            });

            if (updated == null) return NotFound(new { message = "Exam season not found" });

            return Ok(new ExamSeasonDto
            {
                Id = updated.Id,
                Name = updated.Title,
                StartDate = updated.Date,
                EndDate = updated.Date,
                ExamType = updated.Audience ?? "Exam",
                Description = updated.Description
            });
        }

        [HttpDelete("exam-seasons/{id}")]
        public async Task<IActionResult> DeleteExamSeason(string id)
        {
            var deleted = await _timetableService.DeleteAsync(id);
            if (!deleted) return NotFound(new { message = "Exam season not found" });
            return Ok(new { message = "Exam season deleted" });
        }

        [HttpGet("reports/history")]
        public async Task<IActionResult> GetReportHistory()
        {
            var history = await _adminService.GetReportHistoryAsync();
            return Ok(history);
        }

        [HttpGet("reports")]
        public async Task<IActionResult> GetReports([FromQuery] ReportRequest? request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.ReportType)) return BadRequest(new { message = "ReportType is required." });
            try
            {
                var report = await _reportExporter.ExportAsync(request.ReportType, request.Format ?? "pdf");
                await _adminService.CreateReportHistoryAsync(request.ReportType + " Report", report.Extension, User.FindFirst("userId")?.Value ?? "Admin");
                return File(report.Content, report.ContentType, $"{request.ReportType.ToLowerInvariant()}-report-{DateTime.UtcNow:yyyyMMdd}.{report.Extension}");
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpGet("fees")]
        public async Task<IActionResult> GetFees([FromServices] IPaymentService payments)
        {
            return Ok(await payments.GetAllPaymentsAsync());
        }

        [HttpGet("exams")]
        public async Task<IActionResult> GetExams([FromServices] IExamService exams, [FromQuery] string? examType = null)
        {
            return Ok(await exams.GetExamPreparationsAsync(examType));
        }
    }

    public class AdminUpdateReviewRequest
    {
        public int Rating { get; set; }
        public string? Comment { get; set; }
    }
}
