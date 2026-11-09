using System.ComponentModel.DataAnnotations;

namespace ClassBooking.API.Models.Dto
{
    // UserDto is defined in AuthDtos.cs

    public class SystemStatsDto
    {
        public int TotalUsers { get; set; }
        public int TotalTeachers { get; set; }
        public int TotalStudents { get; set; }
        public int TotalBookings { get; set; }
        public int ActiveBookings { get; set; }
        public int CompletedBookings { get; set; }
        public decimal TotalRevenue { get; set; }
        public int NewUsersThisMonth { get; set; }
    }

    public class DashboardStatsDto
    {
        public int TotalUsers { get; set; }
        public int TotalStudents { get; set; }
        public int TotalTeachers { get; set; }
        public int TotalBookings { get; set; }
        public int PendingBookings { get; set; }
        public int CompletedBookings { get; set; }
        public decimal TotalRevenue { get; set; }
        public double AverageRating { get; set; }
    }

    public class UpdateUserStatusRequest
    {
        [Required]
        public string UserId { get; set; } = string.Empty;

        [Required]
        [RegularExpression("^(Active|Suspended|Inactive)$", ErrorMessage = "Status must be Active, Suspended, or Inactive")]
        public string Status { get; set; } = string.Empty;
    }

    public class CreateUserRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string Password { get; set; } = string.Empty;

        [Required]
        [MinLength(2)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [RegularExpression("^(Student|Teacher|Admin)$", ErrorMessage = "Role must be Student, Teacher, or Admin")]
        public string Role { get; set; } = "Student";

        [Phone]
        public string? PhoneNumber { get; set; }
    }

    public class UpdateUserRequest
    {
        [Required]
        public string Id { get; set; } = string.Empty;

        [EmailAddress]
        public string? Email { get; set; }

        [MinLength(2)]
        public string? FullName { get; set; }

        public string? ProfilePicture { get; set; }

        public string? Bio { get; set; }

        [Phone]
        public string? PhoneNumber { get; set; }
    }

    public class SuspendUserRequest
    {
        public string? Reason { get; set; }
    }

    public class ReportRequest
    {
        [Required]
        public string ReportType { get; set; } = string.Empty; // Revenue, Bookings, Users

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? Format { get; set; } = "JSON"; // JSON, PDF, Excel
    }

    public class TimetableEventDto
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Type { get; set; } = string.Empty; // Holiday, ExamPeriod, Event
        public string? Description { get; set; }
        public string? Audience { get; set; } = "All";
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
    }

    public class PublicHolidayDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string? Description { get; set; }
    }

    public class ExamSeasonDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string ExamType { get; set; } = string.Empty; // Stored in Audience for now
        public string? Description { get; set; }
    }

    public class ReportHistoryDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public DateTime GeneratedAt { get; set; }
        public string FileSize { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string CreatedBy { get; set; } = string.Empty;
    }
}
