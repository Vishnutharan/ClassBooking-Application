namespace ClassBooking.API.Models
{
    // ===== EXAM & RESOURCE MODELS =====
    
    public class ExamResult
    {
        public string Id { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public string ExamType { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public double Score { get; set; }
        public double MaxScore { get; set; } = 100;
        public string? Grade { get; set; }
        public DateTime ExamDate { get; set; }
        public string? Term { get; set; }
        public int? Year { get; set; }
        public string? Remarks { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class Resource
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // Video, PDF, Quiz, Notes, PastPaper
        public string Url { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Subject { get; set; }
        public string? Level { get; set; }
        public string? ExamType { get; set; }
        public int? Year { get; set; }
        public string? UploadedBy { get; set; }
        public DateTime UploadedAt { get; set; }
    }

    public class ExamPreparation
    {
        public string Id { get; set; } = string.Empty;
        public string ExamType { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<Resource> Resources { get; set; } = new();
    }

    // ===== FEE & PAYMENT MODELS =====
    
    public class FeeTransaction
    {
        public string Id { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public string? BookingId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "GBP";
        public string Status { get; set; } = "Pending";
        public string? PaymentMethod { get; set; }
        public DateTime? TransactionDate { get; set; }
        public string? Description { get; set; }
        public string? TransactionReference { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class PaymentRequest
    {
        public string BookingId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "GBP";
        public string PaymentMethod { get; set; } = string.Empty;
        public string? PaymentDetails { get; set; } // Card info, bank details, etc.
        public CardPaymentDetails? Card { get; set; }
    }

    public class PaymentResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? TransactionId { get; set; }
        public FeeTransaction? Transaction { get; set; }
    }

    public class CardPaymentDetails
    {
        public string CardholderName { get; set; } = string.Empty;
        public string CardNumber { get; set; } = string.Empty;
        public string ExpiryMonth { get; set; } = string.Empty;
        public string ExpiryYear { get; set; } = string.Empty;
        public string Cvv { get; set; } = string.Empty;
    }

    public class PaymentRecord
    {
        public string Id { get; set; } = string.Empty;
        public string BookingId { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string StudentEmail { get; set; } = string.Empty;
        public string TeacherId { get; set; } = string.Empty;
        public string TeacherName { get; set; } = string.Empty;
        public string TeacherEmail { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string ClassType { get; set; } = string.Empty;
        public DateTime SessionDate { get; set; }
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
        public int DurationMinutes { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "GBP";
        public string? TransactionReference { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? PaidAt { get; set; }
        public string? Notes { get; set; }
    }

    public class EarningsData
    {
        public decimal TotalEarnings { get; set; }
        public decimal MonthlyEarnings { get; set; }
        public decimal PendingEarnings { get; set; }
        public List<MonthlyEarning> MonthlyBreakdown { get; set; } = new();
        public List<SubjectEarning> SubjectBreakdown { get; set; } = new();
    }

    public class MonthlyEarning
    {
        public string Month { get; set; } = string.Empty;
        public int Year { get; set; }
        public decimal Amount { get; set; }
        public int ClassCount { get; set; }
    }

    public class SubjectEarning
    {
        public string Subject { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public int ClassCount { get; set; }
    }

    // ===== NOTIFICATION MODELS =====
    
    public class Notification
    {
        public string Id { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public bool IsRead { get; set; } = false;
        public string? RelatedEntityId { get; set; }
        public string? ActionUrl { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ===== MESSAGE & COMMUNICATION MODELS =====
    
    public class Message
    {
        public string Id { get; set; } = string.Empty;
        public string SenderId { get; set; } = string.Empty;
        public string SenderName { get; set; } = string.Empty;
        public string ReceiverId { get; set; } = string.Empty;
        public string ReceiverName { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public bool IsRead { get; set; } = false;
        public string? AttachmentUrl { get; set; }
        public string? Subject { get; set; }
        public DateTime SentAt { get; set; }
    }

    public class Announcement
    {
        public string Id { get; set; } = string.Empty;
        public string TeacherProfileId { get; set; } = string.Empty;
        public string TeacherName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string TargetAudience { get; set; } = "All";
        public List<string> TargetStudentIds { get; set; } = new();
        public DateTime CreatedAt { get; set; }
    }

    public class Conversation
    {
        public string Id { get; set; } = string.Empty;
        public string OtherPartyId { get; set; } = string.Empty;
        public string OtherPartyName { get; set; } = string.Empty;
        public string? OtherPartyPicture { get; set; }
        public Message? LastMessage { get; set; }
        public int UnreadCount { get; set; }
    }

    // ===== ADMIN & SYSTEM MODELS =====
    
    public class SystemOverview
    {
        public int TotalUsers { get; set; }
        public int TotalTeachers { get; set; }
        public int TotalStudents { get; set; }
        public int PendingTeacherVerifications { get; set; }
        public int TotalBookings { get; set; }
        public int CompletedBookings { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal MonthlyRevenue { get; set; }
    }

    public class UserManagementDto
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLogin { get; set; }
    }
}
