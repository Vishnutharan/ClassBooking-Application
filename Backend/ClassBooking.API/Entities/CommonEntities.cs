using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClassBooking.API.Entities
{
    [Table("Bookings")]
    public class BookingEntity
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        public string StudentId { get; set; } = string.Empty;
        
        [Required]
        public string TeacherId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(200)]
        public string Subject { get; set; } = string.Empty;
        
        [Required]
        public DateTime Date { get; set; }
        
        [Required]
        public string StartTime { get; set; } = string.Empty;
        
        [Required]
        public string EndTime { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending"; // Pending, Confirmed, Cancelled, Completed
        
        [Required]
        [MaxLength(50)]
        public string PaymentStatus { get; set; } = "PENDING"; // PENDING, PAID, FAILED, REFUNDED

        [Required]
        [MaxLength(50)]
        public string ClassType { get; set; } = "PERSONAL_1_1"; // PERSONAL_1_1, GROUP

        [Required]
        [MaxLength(50)]
        public string BookingGradeLevel { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Mode { get; set; } = "ONLINE"; // ONLINE, IN_PERSON

        [Required]
        public string LocationOrLink { get; set; } = string.Empty;

        [Required]
        public decimal Price { get; set; }

        [Required]
        public int DurationMinutes { get; set; }
        
        public string? RecurringDaysJson { get; set; } // JSON array of days
        
        [MaxLength(2000)]
        public string? Notes { get; set; }
        
        [MaxLength(500)]
        public string? MeetingLink { get; set; }
        
        [MaxLength(2000)]
        public string? CancellationReason { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
    
    [Table("StudentProfiles")]
    public class StudentProfileEntity
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        public string UserId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(200)]
        public string FullName { get; set; } = string.Empty;
        
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
        
        [Phone]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Timezone { get; set; } = "UTC";
        
        public string? GuardianInfoJson { get; set; } // { name, contact }
        
        public string? ProfilePicture { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string GradeLevel { get; set; } = "OLevel"; // Primary, OLevel, ALevel
        
        public int? SpecificGrade { get; set; } // 1-13 for Sri Lankan system
        
        [MaxLength(50)]
        public string? Stream { get; set; } // Science, Commerce, Arts, Technology
        
        [MaxLength(200)]
        public string? School { get; set; }
        
        public string? FocusAreasJson { get; set; } // JSON array
        
        public string? TargetExamsJson { get; set; } // JSON array
        
        public int? ExamYear { get; set; }
        
        [MaxLength(200)]
        public string? TargetUniversity { get; set; }
        
        [MaxLength(50)]
        public string? Medium { get; set; } // English, Bilingual, French, Spanish, German
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
    
    [Table("StudyGoals")]
    public class StudyGoalEntity
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        public string StudentId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;
        
        [MaxLength(1000)]
        public string? Description { get; set; }
        
        public DateTime TargetDate { get; set; }
        
        [MaxLength(200)]
        public string? Subject { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string GoalType { get; set; } = "Other"; // StudyHours, ChapterCompletion, MockExam, PastPaper, Other
        
        public double? TargetValue { get; set; }
        
        public double? CurrentValue { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "NotStarted"; // NotStarted, InProgress, Completed, Overdue
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
    
    [Table("ExamResults")]
    public class ExamResultEntity
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        public string StudentId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string ExamType { get; set; } = string.Empty; // OLevel, ALevel, Scholarship, Term
        
        [Required]
        [MaxLength(200)]
        public string Subject { get; set; } = string.Empty;
        
        public double Score { get; set; }
        
        public double MaxScore { get; set; } = 100;
        
        [MaxLength(10)]
        public string? Grade { get; set; } // A, B, C, etc.
        
        public DateTime ExamDate { get; set; }
        
        [MaxLength(50)]
        public string? Term { get; set; } // Term 1, Term 2, etc.
        
        public int? Year { get; set; }
        
        [MaxLength(1000)]
        public string? Remarks { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
    
    [Table("FeeTransactions")]
    public class FeeTransactionEntity
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        public string StudentId { get; set; } = string.Empty;
        
        public string? BookingId { get; set; }
        
        [Required]
        public decimal Amount { get; set; }
        
        [Required]
        [MaxLength(10)]
        public string Currency { get; set; } = "GBP";
        
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending"; // Pending, Paid, Failed, Refunded
        
        [MaxLength(100)]
        public string? PaymentMethod { get; set; } // Cash, Card, Bank Transfer, etc.

        [MaxLength(2000)]
        public string? PaymentMetadataJson { get; set; } // Serialized payment + booking context
        
        public DateTime? TransactionDate { get; set; }
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        [MaxLength(200)]
        public string? TransactionReference { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
    
    [Table("Notifications")]
    public class NotificationEntity
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        public string UserId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string Type { get; set; } = string.Empty; // BookingConfirmed, BookingCancelled, NewMessage, etc.
        
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(1000)]
        public string Message { get; set; } = string.Empty;
        
        public bool IsRead { get; set; } = false;
        
        public string? RelatedEntityId { get; set; }
        
        [MaxLength(500)]
        public string? ActionUrl { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
    
    // Conversation-based messaging system
    [Table("Conversations")]
    public class ConversationEntity
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        [MaxLength(200)]
        public string Subject { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        public string? LastMessageContent { get; set; }
        
        public DateTime? LastMessageAt { get; set; }
        
        // Navigation
        public ICollection<ConversationParticipantEntity> Participants { get; set; } = new List<ConversationParticipantEntity>();
        public ICollection<MessageEntity> Messages { get; set; } = new List<MessageEntity>();
    }
    
    [Table("ConversationParticipants")]
    public class ConversationParticipantEntity
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        public string ConversationId { get; set; } = string.Empty;
        
        [Required]
        public string UserId { get; set; } = string.Empty;
        
        [Required]
        public string UserName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string UserRole { get; set; } = string.Empty; // Teacher, Student
        
        public int UnreadCount { get; set; } = 0;
        
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation
        [ForeignKey("ConversationId")]
        public ConversationEntity? Conversation { get; set; }
    }
    
    [Table("Messages")]
    public class MessageEntity
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        public string ConversationId { get; set; } = string.Empty;
        
        [Required]
        public string SenderId { get; set; } = string.Empty;
        
        [Required]
        public string SenderName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(5000)]
        public string Content { get; set; } = string.Empty;
        
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
        
        public bool IsRead { get; set; } = false;
        
        public DateTime? ReadAt { get; set; }
        
        // Navigation
        [ForeignKey("ConversationId")]
        public ConversationEntity? Conversation { get; set; }
    }
    
    [Table("Announcements")]
    public class AnnouncementEntity
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        public string TeacherProfileId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(5000)]
        public string Content { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string RecipientType { get; set; } = "All Students"; // All Students, Specific Class, Specific Subject
        
        public string? RecipientId { get; set; } // ClassId or SubjectId if specific
        
        public bool IsPinned { get; set; } = false;
        
        public int ViewCount { get; set; } = 0;
        
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? ExpiresAt { get; set; }
    }
    
    [Table("Resources")]
    public class ResourceEntity
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        public string TeacherProfileId { get; set; } = string.Empty;

        public string? StudentId { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;
        
        [MaxLength(1000)]
        public string? Description { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = "PDF"; // PDF, Video, Document, Image, Quiz
        
        [Required]
        [MaxLength(100)]
        public string Subject { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string Level { get; set; } = string.Empty; // Primary, Secondary, Advanced
        
        [Required]
        [MaxLength(500)]
        public string FileName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(1000)]
        public string FilePath { get; set; } = string.Empty;
        
        public long FileSize { get; set; } = 0;
        
        [MaxLength(100)]
        public string? MimeType { get; set; }
        
        public bool IsPublic { get; set; } = false;
        
        public int DownloadCount { get; set; } = 0;
        
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? UpdatedAt { get; set; }
        
        [MaxLength(500)]
        public string? Tags { get; set; } // Comma-separated tags
    }
    
    [Table("ExamPreparations")]
    public class ExamPreparationEntity
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        [MaxLength(100)]
        public string ExamType { get; set; } = string.Empty; // OLevel, ALevel, Scholarship
        
        [Required]
        [MaxLength(200)]
        public string Subject { get; set; } = string.Empty;
        
        [MaxLength(2000)]
        public string Description { get; set; } = string.Empty;
        
        public string? ResourceIdsJson { get; set; } // JSON array of resource IDs
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
