using ClassBooking.API.Models;
using ClassBooking.API.Entities;
using ClassBooking.API.Repositories;

namespace ClassBooking.API.Services
{
    public interface ITeacherService
    {
        Task<List<TeacherProfile>> GetAllTeachersAsync();
        Task<TeacherProfile?> GetTeacherByIdAsync(string id);
        Task<TeacherProfile?> GetTeacherByUserIdAsync(string userId);
        Task<List<TeacherProfile>> SearchTeachersAsync(string? subject, string? level, string? medium);
        Task<List<TeacherProfile>> GetTopRatedTeachersAsync(int limit = 10);
        Task<TeacherProfile> CreateTeacherAsync(TeacherProfile profile);
        Task<TeacherProfile> UpdateTeacherProfileAsync(string teacherProfileId, TeacherProfile updates);
        Task<TeacherSubject> AddSubjectAsync(string teacherProfileId, TeacherSubject subject);
        Task<bool> RemoveSubjectAsync(string subjectId);
        Task UpdateAvailabilityAsync(string teacherProfileId, List<TeacherAvailability> availability);
        Task<List<ReviewDto>> GetTeacherReviewsAsync(string teacherProfileId);
        Task<ReviewDto> AddReviewAsync(string teacherProfileId, string studentId, string studentName, int rating, string? comment);
        Task<List<TeacherAvailabilitySlot>> GetAvailabilitySlotsAsync(string teacherProfileId, DateTime? startDate, DateTime? endDate);
        Task<TeacherAvailabilitySlot> AddAvailabilitySlotAsync(string teacherProfileId, DateTime date, string startTime, string endTime);
        Task<TeacherAvailabilitySlot?> FindAvailabilitySlotAsync(string teacherProfileId, DateTime date, string startTime, string endTime);
        Task<bool> UpdateAvailabilitySlotStatusAsync(string slotId, string status, string? bookingId = null);
        Task<TeacherAvailabilitySlot?> GetAvailabilitySlotByBookingAsync(string bookingId);
        Task<bool> ReleaseAvailabilitySlotAsync(string bookingId);
        Task<bool> DeleteAvailabilitySlotAsync(string slotId, string teacherProfileId);
        
        // Analytics
        Task<object> GetAnalyticsAsync(string teacherId, string period);
        Task<object> GetEarningsAsync(string teacherId, string period);
    }

    public class TeacherService : ITeacherService
    {
        private readonly ITeacherRepository _repository;
        private readonly IFeeRepository _feeRepository;

        public TeacherService(ITeacherRepository repository, IFeeRepository feeRepository)
        {
            _repository = repository;
            _feeRepository = feeRepository;
        }

        public async Task<List<TeacherProfile>> GetAllTeachersAsync()
        {
            var entities = await _repository.GetAllTeachersAsync();
            return entities.Select(MapToDto).ToList();
        }

        public async Task<TeacherProfile?> GetTeacherByIdAsync(string id)
        {
            var entity = await _repository.GetTeacherByIdAsync(id);
            return entity != null ? MapToDto(entity) : null;
        }

        public async Task<TeacherProfile?> GetTeacherByUserIdAsync(string userId)
        {
            var entity = await _repository.GetTeacherByUserIdAsync(userId);
            return entity != null ? MapToDto(entity) : null;
        }

        public async Task<List<TeacherProfile>> SearchTeachersAsync(string? subject, string? level, string? medium)
        {
            var entities = await _repository.SearchTeachersAsync(subject, level, medium);
            return entities.Select(MapToDto).ToList();
        }

        public async Task<List<TeacherProfile>> GetTopRatedTeachersAsync(int limit = 10)
        {
            var entities = await _repository.GetTopRatedTeachersAsync(limit);
            return entities.Select(MapToDto).ToList();
        }

        public async Task<TeacherProfile> CreateTeacherAsync(TeacherProfile profile)
        {
            var entity = MapToEntity(profile);
            var created = await _repository.CreateTeacherAsync(entity);
            return MapToDto(created);
        }

        public async Task<TeacherProfile> UpdateTeacherProfileAsync(string teacherProfileId, TeacherProfile updates)
        {
            var existing = await _repository.GetTeacherByIdAsync(teacherProfileId);
            if (existing == null)
                throw new InvalidOperationException("Teacher profile not found");

            // Update only the fields that are provided
            if (!string.IsNullOrEmpty(updates.Bio)) existing.Bio = updates.Bio;
            if (updates.HourlyRate > 0) existing.HourlyRate = updates.HourlyRate;
            if (updates.ExperienceYears >= 0) existing.ExperienceYears = updates.ExperienceYears;
            if (!string.IsNullOrEmpty(updates.ProfilePicture)) existing.ProfilePicture = updates.ProfilePicture;
            existing.IsAvailable = updates.IsAvailable;
            
            // New Fields
            if (!string.IsNullOrEmpty(updates.TeachingMode)) existing.TeachingMode = updates.TeachingMode;
            if (!string.IsNullOrEmpty(updates.Policies)) existing.Policies = updates.Policies;
            if (!string.IsNullOrEmpty(updates.LocationAddress)) existing.LocationAddress = updates.LocationAddress;
            if (!string.IsNullOrEmpty(updates.MeetingLink)) existing.MeetingLink = updates.MeetingLink;

            var updated = await _repository.UpdateTeacherAsync(existing);
            return MapToDto(updated);
        }

        public async Task<TeacherSubject> AddSubjectAsync(string teacherProfileId, TeacherSubject subject)
        {
            var subjectEntity = new TeacherSubjectEntity
            {
                TeacherProfileId = teacherProfileId,
                Name = subject.Name,
                Medium = subject.Medium,
                Level = subject.Level,
                Grades = subject.Grades,
                ClassTypes = string.Join(",", subject.ClassTypes)
            };

            var created = await _repository.AddSubjectAsync(subjectEntity);
            return new TeacherSubject
            {
                Id = created.Id,
                Name = created.Name,
                Medium = created.Medium,
                Level = created.Level,
                Grades = created.Grades,
                ClassTypes = created.ClassTypes.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList()
            };
        }

        public async Task<bool> RemoveSubjectAsync(string subjectId)
        {
            return await _repository.RemoveSubjectAsync(subjectId);
        }

        public async Task UpdateAvailabilityAsync(string teacherProfileId, List<TeacherAvailability> availability)
        {
            var entities = availability.Select(a => new TeacherAvailabilityEntity
            {
                TeacherProfileId = teacherProfileId,
                DayOfWeek = a.DayOfWeek,
                StartTime = a.StartTime,
                EndTime = a.EndTime
            }).ToList();

            await _repository.UpdateTeacherAvailabilityAsync(teacherProfileId, entities);
        }

        public async Task<List<TeacherAvailabilitySlot>> GetAvailabilitySlotsAsync(string teacherProfileId, DateTime? startDate, DateTime? endDate)
        {
            var slots = await _repository.GetAvailabilitySlotsAsync(teacherProfileId, startDate, endDate);
            if (slots.Count == 0 && !string.IsNullOrWhiteSpace(teacherProfileId))
            {
                var teacher = await _repository.GetTeacherByIdAsync(teacherProfileId);
                if (teacher != null)
                {
                    var fromDate = (startDate ?? DateTime.UtcNow).Date;
                    var toDate = (endDate ?? fromDate.AddDays(14)).Date;
                    if ((toDate - fromDate).TotalDays > 31) toDate = fromDate.AddDays(31);
                    var defaultTimes = new (string Start, string End)[]
                    {
                        ("09:00", "10:00"),
                        ("11:00", "12:00"),
                        ("14:00", "15:00"),
                        ("16:00", "17:00"),
                        ("18:00", "19:00")
                    };
                    for (var day = fromDate; day <= toDate; day = day.AddDays(1))
                    {
                        foreach (var (s, e) in defaultTimes)
                        {
                            var created = await _repository.AddAvailabilitySlotAsync(new TeacherAvailabilitySlotEntity
                            {
                                TeacherProfileId = teacherProfileId,
                                Date = day,
                                StartTime = s,
                                EndTime = e,
                                Status = "Available"
                            });
                            slots.Add(created);
                        }
                    }
                }
            }
            return slots.Select(MapToSlotDto).ToList();
        }

        public async Task<TeacherAvailabilitySlot> AddAvailabilitySlotAsync(string teacherProfileId, DateTime date, string startTime, string endTime)
        {
            var entity = new TeacherAvailabilitySlotEntity
            {
                TeacherProfileId = teacherProfileId,
                Date = date.Date,
                StartTime = startTime,
                EndTime = endTime,
                Status = "Available"
            };

            var created = await _repository.AddAvailabilitySlotAsync(entity);
            return MapToSlotDto(created);
        }

        public async Task<TeacherAvailabilitySlot?> FindAvailabilitySlotAsync(string teacherProfileId, DateTime date, string startTime, string endTime)
        {
            var slot = await _repository.GetAvailabilitySlotAsync(teacherProfileId, date, startTime, endTime);
            return slot != null ? MapToSlotDto(slot) : null;
        }

        public async Task<bool> UpdateAvailabilitySlotStatusAsync(string slotId, string status, string? bookingId = null)
        {
            return await _repository.UpdateAvailabilitySlotStatusAsync(slotId, status, bookingId);
        }

        public async Task<TeacherAvailabilitySlot?> GetAvailabilitySlotByBookingAsync(string bookingId)
        {
            var slot = await _repository.GetAvailabilitySlotByBookingAsync(bookingId);
            return slot != null ? MapToSlotDto(slot) : null;
        }

        public async Task<bool> ReleaseAvailabilitySlotAsync(string bookingId)
        {
            return await _repository.ReleaseSlotByBookingAsync(bookingId);
        }

        public async Task<bool> DeleteAvailabilitySlotAsync(string slotId, string teacherProfileId)
        {
            return await _repository.DeleteAvailabilitySlotAsync(slotId, teacherProfileId);
        }

        public async Task<List<ReviewDto>> GetTeacherReviewsAsync(string teacherProfileId)
        {
            var reviews = await _repository.GetTeacherReviewsAsync(teacherProfileId);
            return reviews.Select(r => new ReviewDto
            {
                Id = r.Id,
                StudentName = r.StudentName,
                Rating = r.Rating,
                Comment = r.Comment,
                CreatedAt = r.CreatedAt
            }).ToList();
        }

        public async Task<ReviewDto> AddReviewAsync(string teacherProfileId, string studentId, string studentName, int rating, string? comment)
        {
            var review = new ReviewEntity
            {
                TeacherProfileId = teacherProfileId,
                StudentId = studentId,
                StudentName = studentName,
                Rating = rating,
                Comment = comment
            };

            var created = await _repository.AddReviewAsync(review);
            return new ReviewDto
            {
                Id = created.Id,
                StudentName = created.StudentName,
                Rating = created.Rating,
                Comment = created.Comment,
                CreatedAt = created.CreatedAt
            };
        }

        public async Task<object> GetAnalyticsAsync(string teacherId, string period)
        {
            var teacher = await _repository.GetTeacherByIdAsync(teacherId);
            if (teacher == null) return new { };

            // In a real app, we would calculate these from bookings and other tables
            // For now, we use the aggregate data in TeacherProfile
            return new
            {
                TotalStudents = teacher.TotalClasses, // Placeholder
                TotalClasses = teacher.TotalClasses,
                AverageRating = teacher.AverageRating,
                TotalReviews = teacher.TotalReviews,
                MonthlyEarnings = await _feeRepository.GetTotalEarningsAsync(teacherId, DateTime.UtcNow.AddDays(-30))
            };
        }

        public async Task<object> GetEarningsAsync(string teacherId, string period)
        {
            var totalEarnings = await _feeRepository.GetTotalEarningsAsync(teacherId);
            
            // Mock chart data for now
            var chartData = new[]
            {
                new { name = "Jan", value = 1000 },
                new { name = "Feb", value = 1500 },
                new { name = "Mar", value = 1200 }
            };

            return new
            {
                TotalEarnings = totalEarnings,
                ChartData = chartData
            };
        }

        // Mapping helpers
        private TeacherProfile MapToDto(TeacherProfileEntity entity)
        {
            return new TeacherProfile
            {
                Id = entity.Id,
                UserId = entity.UserId,
                FullName = entity.FullName,
                Email = entity.Email,
                PhoneNumber = entity.PhoneNumber,
                ProfilePicture = entity.ProfilePicture,
                Bio = entity.Bio,
                Qualifications = entity.Qualifications.Select(q => q.Qualification).ToList(),
                Subjects = entity.Subjects.Select(s => new TeacherSubject
                {
                    Id = s.Id,
                    Name = s.Name,
                    Medium = s.Medium,
                    Level = s.Level,
                    Grades = s.Grades,
                    CurriculumBoard = s.CurriculumBoard,
                    ClassTypes = s.ClassTypes.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList()
                }).ToList(),
                HourlyRate = entity.HourlyRate,
                ExperienceYears = entity.ExperienceYears,
                AverageRating = entity.AverageRating,
                TotalReviews = entity.TotalReviews,
                TotalClasses = entity.TotalClasses,
                IsAvailable = entity.IsAvailable,
                Availability = entity.Availability.Select(a => new TeacherAvailability
                {
                    DayOfWeek = a.DayOfWeek,
                    StartTime = a.StartTime,
                    EndTime = a.EndTime
                }).ToList(),
                VerificationStatus = entity.VerificationStatus,
                CreatedAt = entity.CreatedAt,
                UpdatedAt = entity.UpdatedAt,
                TeachingMode = entity.TeachingMode,
                Policies = entity.Policies,
                LocationAddress = entity.LocationAddress,
                MeetingLink = entity.MeetingLink
            };
        }


        private TeacherProfileEntity MapToEntity(TeacherProfile dto)
        {
            var entity = new TeacherProfileEntity
            {
                Id = dto.Id,
                UserId = dto.UserId,
                FullName = dto.FullName,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                ProfilePicture = dto.ProfilePicture,
                Bio = dto.Bio,
                HourlyRate = dto.HourlyRate,
                ExperienceYears = dto.ExperienceYears,
                IsAvailable = dto.IsAvailable,
                VerificationStatus = dto.VerificationStatus
            };

            // Add qualifications
            if (dto.Qualifications != null)
            {
                entity.Qualifications = dto.Qualifications.Select(q => new TeacherQualificationEntity
                {
                    TeacherProfileId = entity.Id,
                    Qualification = q
                }).ToList();
            }

            // Add subjects
            if (dto.Subjects != null)
            {
                entity.Subjects = dto.Subjects.Select(s => new TeacherSubjectEntity
                {
                    Id = s.Id,
                    TeacherProfileId = entity.Id,
                    Name = s.Name,
                    Medium = s.Medium,
                    Level = s.Level
                }).ToList();
            }

            // Add availability
            if (dto.Availability != null)
            {
                entity.Availability = dto.Availability.Select(a => new TeacherAvailabilityEntity
                {
                    TeacherProfileId = entity.Id,
                    DayOfWeek = a.DayOfWeek,
                    StartTime = a.StartTime,
                    EndTime = a.EndTime
                }).ToList();
            }

            return entity;
        }

        private TeacherAvailabilitySlot MapToSlotDto(TeacherAvailabilitySlotEntity entity)
        {
            return new TeacherAvailabilitySlot
            {
                Id = entity.Id,
                TeacherProfileId = entity.TeacherProfileId,
                Date = entity.Date,
                StartTime = entity.StartTime,
                EndTime = entity.EndTime,
                Status = entity.Status,
                BookingId = entity.BookingId
            };
        }
    }

    public class ReviewDto
    {
        public string Id { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
