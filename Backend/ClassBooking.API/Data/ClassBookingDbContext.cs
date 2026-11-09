using ClassBooking.API.Models;
using ClassBooking.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClassBooking.API.Data
{
    public class ClassBookingDbContext : DbContext
    {
        public ClassBookingDbContext(DbContextOptions<ClassBookingDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<TeacherProfileEntity> TeacherProfiles { get; set; }
        public DbSet<TeacherQualificationEntity> TeacherQualifications { get; set; }
        public DbSet<TeacherSubjectEntity> TeacherSubjects { get; set; }
        public DbSet<TeacherAvailabilityEntity> TeacherAvailabilities { get; set; }
        public DbSet<ReviewEntity> Reviews { get; set; }
        public DbSet<AttendanceRecordEntity> AttendanceRecords { get; set; }
        public DbSet<LessonPlanEntity> LessonPlans { get; set; }
        public DbSet<TeacherStudentEntity> TeacherStudents { get; set; }
        
        // New entities
        public DbSet<BookingEntity> Bookings { get; set; }
        public DbSet<StudentProfileEntity> StudentProfiles { get; set; }
        public DbSet<StudyGoalEntity> StudyGoals { get; set; }
        public DbSet<ExamResultEntity> ExamResults { get; set; }
        public DbSet<FeeTransactionEntity> FeeTransactions { get; set; }
        public DbSet<NotificationEntity> Notifications { get; set; }
        public DbSet<MessageEntity> Messages { get; set; }
        public DbSet<ConversationEntity> Conversations { get; set; }
        public DbSet<ConversationParticipantEntity> ConversationParticipants { get; set; }
        public DbSet<AnnouncementEntity> Announcements { get; set; }
        public DbSet<ResourceEntity> Resources { get; set; }
        public DbSet<ExamPreparationEntity> ExamPreparations { get; set; }
        public DbSet<ReportHistoryEntity> ReportHistory { get; set; }
        public DbSet<TeacherAvailabilitySlotEntity> TeacherAvailabilitySlots { get; set; }
        public DbSet<TimetableEventEntity> TimetableEvents { get; set; }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.Property(e => e.Role).IsRequired();
                entity.Property(e => e.Status).HasDefaultValue("Active");
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETDATE()");
            });

            // Configure TeacherProfile relationships
            modelBuilder.Entity<TeacherProfileEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.UserId).IsUnique();
                entity.HasIndex(e => e.Email);
                entity.Property(e => e.HourlyRate).HasColumnType("decimal(18,2)");
                
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasMany(e => e.Qualifications)
                    .WithOne(q => q.TeacherProfile)
                    .HasForeignKey(q => q.TeacherProfileId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasMany(e => e.Subjects)
                    .WithOne(s => s.TeacherProfile)
                    .HasForeignKey(s => s.TeacherProfileId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasMany(e => e.Availability)
                    .WithOne(a => a.TeacherProfile)
                    .HasForeignKey(a => a.TeacherProfileId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasMany(e => e.Reviews)
                    .WithOne(r => r.TeacherProfile)
                    .HasForeignKey(r => r.TeacherProfileId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.Property(e => e.HourlyRate).HasColumnType("decimal(18,2)");
            });

            modelBuilder.Entity<TeacherQualificationEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TeacherProfileId);
            });

            modelBuilder.Entity<TeacherSubjectEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TeacherProfileId);
            });

            modelBuilder.Entity<TeacherAvailabilityEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TeacherProfileId);
            });

            modelBuilder.Entity<TeacherAvailabilitySlotEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.TeacherProfileId, e.Date });
                entity.HasIndex(e => new { e.TeacherProfileId, e.Status });
            });

            modelBuilder.Entity<TimetableEventEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Date);
                entity.HasIndex(e => e.Audience);
                entity.Property(e => e.Title).IsRequired();
            });

            modelBuilder.Entity<ReviewEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TeacherProfileId);
                entity.HasIndex(e => e.StudentId);
            });

            modelBuilder.Entity<AttendanceRecordEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TeacherProfileId);
                entity.HasIndex(e => e.StudentId);
                entity.HasIndex(e => e.ClassDate);
            });

            modelBuilder.Entity<LessonPlanEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TeacherProfileId);
            });

            modelBuilder.Entity<TeacherStudentEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.TeacherProfileId, e.StudentId }).IsUnique();
            });

            // Configure Booking entity
            modelBuilder.Entity<BookingEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.StudentId);
                entity.HasIndex(e => e.TeacherId);
                entity.HasIndex(e => e.Date);
                entity.HasIndex(e => e.Status);
                entity.Property(e => e.Price).HasColumnType("decimal(18,2)");
            });

            // Configure StudentProfile entity
            modelBuilder.Entity<StudentProfileEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.UserId).IsUnique();
                entity.HasIndex(e => e.Email);
            });

            // Configure StudyGoal entity
            modelBuilder.Entity<StudyGoalEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.StudentId);
                entity.HasIndex(e => e.Status);
            });

            // Configure ExamResult entity
            modelBuilder.Entity<ExamResultEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.StudentId);
                entity.HasIndex(e => new { e.ExamType, e.Subject });
            });

            // Configure FeeTransaction entity
            modelBuilder.Entity<FeeTransactionEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.StudentId);
                entity.HasIndex(e => e.BookingId);
                entity.HasIndex(e => e.Status);
                entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
            });

            // Configure Notification entity
            modelBuilder.Entity<NotificationEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => new { e.UserId, e.IsRead });
            });

            // Configure Message and Conversation entities
            modelBuilder.Entity<ConversationEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.UpdatedAt);
                
                entity.HasMany(e => e.Participants)
                    .WithOne(p => p.Conversation)
                    .HasForeignKey(p => p.ConversationId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasMany(e => e.Messages)
                    .WithOne(m => m.Conversation)
                    .HasForeignKey(m => m.ConversationId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
            
            modelBuilder.Entity<ConversationParticipantEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.ConversationId, e.UserId }).IsUnique();
                entity.HasIndex(e => e.UserId);
            });
            
            modelBuilder.Entity<MessageEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.ConversationId);
                entity.HasIndex(e => e.SenderId);
                entity.HasIndex(e => new { e.ConversationId, e.SentAt });
            });

            // Configure Announcement entity
            modelBuilder.Entity<AnnouncementEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TeacherProfileId);
            });

            // Configure Resource entity
            modelBuilder.Entity<ResourceEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TeacherProfileId);
                entity.HasIndex(e => e.Subject);
                entity.HasIndex(e => e.Type);
                entity.HasIndex(e => e.Level);
            });

            // Configure ExamPreparation entity
            modelBuilder.Entity<ExamPreparationEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.ExamType, e.Subject });
            });
        }
    }
}
