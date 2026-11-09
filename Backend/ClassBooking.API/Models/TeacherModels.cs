
namespace ClassBooking.API.Models
{
    public class TeacherProfile
    {
        public string Id { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string? ProfilePicture { get; set; }
        public string? Bio { get; set; }
        public List<string> Qualifications { get; set; } = new();
        public List<TeacherSubject> Subjects { get; set; } = new();
        public decimal HourlyRate { get; set; }
        public int ExperienceYears { get; set; }
        public double AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public int TotalClasses { get; set; }
        public bool IsAvailable { get; set; }
        public List<TeacherAvailability> Availability { get; set; } = new();
        public string VerificationStatus { get; set; } = "Pending"; // Pending, Verified, Rejected
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? Policies { get; set; }
        public string TeachingMode { get; set; } = "ONLINE";
        public string? LocationAddress { get; set; }
        public string? MeetingLink { get; set; }
    }

    public class TeacherSubject
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Medium { get; set; } = "English"; // English, Bilingual, French, Spanish, German
        public string Level { get; set; } = "OLevel"; // Primary, OLevel, ALevel, Secondary, Advanced
        public string? CurriculumBoard { get; set; }
        public string Grades { get; set; } = string.Empty;
        public List<string> ClassTypes { get; set; } = new List<string> { "PERSONAL_1_1" };
    }

    public class TeacherAvailability
    {
        public string DayOfWeek { get; set; } = string.Empty;
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
    }

    public class TeacherAvailabilitySlot
    {
        public string Id { get; set; } = string.Empty;
        public string TeacherProfileId { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
        public string Status { get; set; } = "Available";
        public string? BookingId { get; set; }
    }
}
