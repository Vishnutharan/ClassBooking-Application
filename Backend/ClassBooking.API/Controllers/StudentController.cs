using ClassBooking.API.Models;
using ClassBooking.API.Services;
using ClassBooking.API.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System.Text.Json;
using ClassBooking.API.Entities;
using System.Linq;

namespace ClassBooking.API.Controllers
{
    [Route("api/students")]
    [ApiController]
    [Authorize]
    public class StudentController : ControllerBase
    {
        private readonly IStudentService _studentService;
        private readonly IStudentRepository _studentRepository;
        private readonly ITeacherRepository _teacherRepository;
        private readonly IExamService _examService;
        private readonly IResourceService _resourceService;
        private readonly IBookingService _bookingService;
        private readonly ILessonPlanService _lessonPlanService;

        private record ActivityItem(string Type, string Message, DateTime Timestamp);

        public StudentController(
            IStudentService studentService,
            IStudentRepository studentRepository,
            ITeacherRepository teacherRepository,
            IExamService examService,
            IResourceService resourceService,
            IBookingService bookingService,
            ILessonPlanService lessonPlanService)
        {
            _studentService = studentService;
            _studentRepository = studentRepository;
            _teacherRepository = teacherRepository;
            _examService = examService;
            _resourceService = resourceService;
            _bookingService = bookingService;
            _lessonPlanService = lessonPlanService;
        }

        [HttpGet("profile")]
        public async Task<ActionResult<StudentProfile>> GetProfile()
        {
            var userId = User.FindFirst("userId")?.Value ?? throw new UnauthorizedAccessException();
            var profileEntity = await _studentRepository.GetByUserIdAsync(userId);
            
            if (profileEntity == null)
                return NotFound();
            
            var profile = new StudentProfile
            {
                Id = profileEntity.Id,
                UserId = profileEntity.UserId,
                FullName = profileEntity.FullName,
                Email = profileEntity.Email,
                PhoneNumber = profileEntity.PhoneNumber,
                School = profileEntity.School,
                GradeLevel = profileEntity.GradeLevel
            };

            if (!string.IsNullOrEmpty(profileEntity.GuardianInfoJson))
            {
               try 
               {
                    using (JsonDocument doc = JsonDocument.Parse(profileEntity.GuardianInfoJson))
                    {
                        if (doc.RootElement.TryGetProperty("name", out JsonElement nameElement))
                            profile.ParentName = nameElement.GetString();
                        if (doc.RootElement.TryGetProperty("contact", out JsonElement contactElement))
                            profile.ParentContact = contactElement.GetString();
                    }
               }
               catch {}
            }
            
            return Ok(profile);
        }

        [HttpPut("profile")]
        public async Task<ActionResult<StudentProfile>> UpdateProfile([FromBody] StudentProfile profile)
        {
            var userId = User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            
            var existing = await _studentRepository.GetByUserIdAsync(userId);
            if (existing == null)
                return NotFound("Student profile not found.");
            
            // Update fields
            existing.FullName = profile.FullName;
            existing.PhoneNumber = profile.PhoneNumber;
            existing.School = profile.School;
            existing.GradeLevel = profile.GradeLevel;
            existing.UpdatedAt = DateTime.UtcNow;

            if (!string.IsNullOrEmpty(profile.ParentName) || !string.IsNullOrEmpty(profile.ParentContact))
            {
                var guardianInfo = new { name = profile.ParentName, contact = profile.ParentContact };
                existing.GuardianInfoJson = JsonSerializer.Serialize(guardianInfo);
            }
            
            try 
            {
                var updated = await _studentRepository.UpdateAsync(existing);
                
                profile.Id = updated.Id;
                profile.UserId = updated.UserId;
                
                return Ok(profile);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating profile", details = ex.Message });
            }
        }


        [HttpGet("recommended-teachers")]
        public async Task<ActionResult<List<TeacherProfile>>> GetRecommendedTeachers()
        {
            // For now, return top-rated teachers as recommendations
            var teachers = await _teacherRepository.GetTopRatedTeachersAsync(5);
            
            var teacherProfiles = teachers.Select(t => new TeacherProfile
            {
                Id = t.Id,
                UserId = t.UserId,
                FullName = t.FullName,
                Email = t.Email,
                PhoneNumber = t.PhoneNumber,
                ProfilePicture = t.ProfilePicture,
                Bio = t.Bio,
                HourlyRate = t.HourlyRate,
                AverageRating = t.AverageRating,
                TotalReviews = t.TotalReviews,
                Subjects = t.Subjects.Select(s => new TeacherSubject
                {
                    Id = s.Id,
                    Name = s.Name,
                    Level = s.Level,
                    Medium = s.Medium
                }).ToList(),
                Availability = t.Availability.Select(a => new TeacherAvailability
                {
                    DayOfWeek = a.DayOfWeek,
                    StartTime = a.StartTime,
                    EndTime = a.EndTime
                }).ToList()
            }).ToList();
            
            return Ok(teacherProfiles);
        }

        [HttpGet("exam-preparations")]
        public async Task<ActionResult<List<ExamPreparation>>> GetExamPreparations([FromQuery] string? examType)
        {
            var entities = await _examService.GetExamPreparationsAsync(examType);
            return Ok(entities.Select(e => new ExamPreparation
            {
                Id = e.Id,
                ExamType = e.ExamType,
                Subject = e.Subject,
                Description = e.Description
            }).ToList());
        }

        [HttpGet("study-materials")]
        public async Task<ActionResult<List<Resource>>> GetStudyMaterials([FromQuery] string? subject)
        {
            var entities = await _resourceService.GetResourcesAsync(subject, null, null, null);
            return Ok(entities.Select(r => new Resource
            {
                Id = r.Id,
                Title = r.Title,
                Type = r.Type,
                Url = r.FilePath, // Using FilePath as Url
                Description = r.Description,
                Subject = r.Subject,
                UploadedAt = r.UploadedAt
            }).ToList());
        }

        [HttpGet("past-papers")]
        public async Task<ActionResult<List<Resource>>> GetPastPapers([FromQuery] string? subject, [FromQuery] int? year)
        {
            var entities = await _resourceService.GetPastPapersAsync(subject, year);
            return Ok(entities.Select(r => new Resource
            {
                Id = r.Id,
                Title = r.Title,
                Type = r.Type,
                Url = r.FilePath, // Using FilePath as Url
                Description = r.Description,
                Subject = r.Subject,
                UploadedAt = r.UploadedAt
            }).ToList());
        }

        [HttpGet("summary")]
        [HttpGet("summary-stats")]
        public async Task<ActionResult<object>> GetSummary()
        {
            var userId = User.FindFirst("userId")?.Value ?? throw new UnauthorizedAccessException();
            var progress = await _studentService.GetProgressAsync(userId);

            var bookings = await _bookingService.GetBookingsForStudentAsync(userId);

            var total = bookings.Count;
            var completed = bookings.Count(b => b.Status == "Completed");
            var upcoming = bookings.Count(b => (b.Status == "Confirmed" || b.Status == "Pending") && b.Date >= DateTime.UtcNow.Date);

            double hours = bookings
                .Where(b => b.Status == "Completed")
                .Sum(b => GetDurationHours(b.StartTime, b.EndTime));

            var overall = progress.Any()
                ? (int)progress.Average(p => p.AverageScore)
                : 0;

            return Ok(new
            {
                totalClasses = total,
                upcomingClasses = upcoming,
                completedClasses = completed,
                studyHours = Math.Round(hours, 1),
                progressPercentage = overall,
                averageRating = 0
            });
        }

        [HttpGet("study-goals")]
        public async Task<ActionResult<List<StudyGoal>>> GetStudyGoals()
        {
            var userId = User.FindFirst("userId")?.Value ?? throw new UnauthorizedAccessException();
            var profile = await _studentRepository.GetByUserIdAsync(userId);
            
            if (profile == null)
                return Ok(new List<StudyGoal>());
            
            var goals = await _studentRepository.GetStudyGoalsAsync(profile.Id);
            
            return Ok(goals.Select(g => new StudyGoal
            {
                Id = g.Id,
                StudentId = g.StudentId,
                Title = g.Title,
                Description = g.Description,
                TargetDate = g.TargetDate,
                Subject = g.Subject,
                GoalType = g.GoalType,
                TargetValue = (int?)g.TargetValue,
                CurrentValue = (int?)g.CurrentValue,
                Status = g.Status,
                CreatedAt = g.CreatedAt,
                UpdatedAt = g.UpdatedAt
            }).ToList());
        }

        [HttpPost("study-goals")]
        public async Task<ActionResult<StudyGoal>> CreateStudyGoal([FromBody] StudyGoal goal)
        {
            var userId = User.FindFirst("userId")?.Value ?? throw new UnauthorizedAccessException();
            var profile = await _studentRepository.GetByUserIdAsync(userId);
            
            if (profile == null)
                return NotFound("Student profile not found");
            
            var goalEntity = new Entities.StudyGoalEntity
            {
                Id = Guid.NewGuid().ToString(),
                StudentId = profile.Id,
                Title = goal.Title,
                Description = goal.Description,
                TargetDate = goal.TargetDate,
                Subject = goal.Subject,
                GoalType = goal.GoalType,
                TargetValue = goal.TargetValue,
                CurrentValue = goal.CurrentValue,
                Status = goal.Status,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            
            var created = await _studentRepository.CreateStudyGoalAsync(goalEntity);
            
            goal.Id = created.Id;
            goal.CreatedAt = created.CreatedAt;
            goal.UpdatedAt = created.UpdatedAt;
            
            return Ok(goal);
        }

        // Student Review Endpoints
        [HttpGet("my-reviews")]
        public async Task<ActionResult<List<object>>> GetMyReviews()
        {
            var userId = User.FindFirst("userId")?.Value ?? throw new UnauthorizedAccessException();
            var profile = await _studentRepository.GetByUserIdAsync(userId);
            
            if (profile == null)
                return Ok(new List<object>());

            var reviews = await _studentService.GetStudentReviewsAsync(userId);
            
            return Ok(reviews.Select(r => new
            {
                id = r.Id,
                teacherId = r.TeacherProfileId,
                teacherName = r.TeacherProfile?.FullName ?? "Unknown Teacher",
                rating = r.Rating,
                comment = r.Comment,
                createdAt = r.CreatedAt
            }).ToList());
        }

        [HttpPost("reviews")]
        public async Task<ActionResult> SubmitReview([FromBody] SubmitReviewRequest request)
        {
            if (!User.IsInRole("Student")) return Forbid();
            if (request.Rating is < 1 or > 5 || string.IsNullOrWhiteSpace(request.Comment))
                return BadRequest(new { message = "A rating from 1 to 5 and a comment are required." });
            var userId = User.FindFirst("userId")?.Value ?? throw new UnauthorizedAccessException();
            var profile = await _studentRepository.GetByUserIdAsync(userId);
            
            if (profile == null)
                return NotFound("Student profile not found");

            // Ensure the student actually booked this teacher (confirmed or completed)
            var bookings = await _bookingService.GetBookingsForStudentAsync(userId);
            var hasBooking = bookings.Any(b => b.TeacherId == request.TeacherId &&
                (b.Status == "Confirmed" || b.Status == "Completed"));
            if (!hasBooking)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "You can only review teachers you have booked." });

            var priorReviews = await _studentService.GetStudentReviewsAsync(userId);
            if (priorReviews.Any(r => r.TeacherProfileId == request.TeacherId))
                return Conflict(new { message = "You have already reviewed this teacher." });

            var review = new Entities.ReviewEntity
            {
                Id = Guid.NewGuid().ToString(),
                StudentId = userId,
                StudentName = profile.FullName,
                TeacherProfileId = request.TeacherId,
                Rating = request.Rating,
                Comment = request.Comment,
                CreatedAt = DateTime.UtcNow
            };

            await _studentService.SubmitReviewAsync(review);
            
            return Ok(new { message = "Review submitted successfully", id = review.Id });
        }

        [HttpPut("reviews/{reviewId}")]
        public async Task<ActionResult> UpdateReview(string reviewId, [FromBody] UpdateReviewRequest request)
        {
            if (!User.IsInRole("Student")) return Forbid();
            if (request.Rating is < 1 or > 5 || string.IsNullOrWhiteSpace(request.Comment))
                return BadRequest(new { message = "A rating from 1 to 5 and a comment are required." });
            var userId = User.FindFirst("userId")?.Value ?? throw new UnauthorizedAccessException();
            var profile = await _studentRepository.GetByUserIdAsync(userId);
            
            if (profile == null)
                return NotFound("Student profile not found");

            var updated = await _studentService.UpdateReviewAsync(reviewId, userId, request.Rating, request.Comment);
            if (!updated) return NotFound(new { message = "Review not found or not owned by you" });
            
            return Ok(new { message = "Review updated successfully" });
        }

        [HttpDelete("reviews/{reviewId}")]
        public async Task<ActionResult> DeleteReview(string reviewId)
        {
            var userId = User.FindFirst("userId")?.Value ?? throw new UnauthorizedAccessException();
            var profile = await _studentRepository.GetByUserIdAsync(userId);
            
            if (profile == null)
                return NotFound("Student profile not found");

            var deleted = await _studentService.DeleteReviewAsync(reviewId, userId);
            if (!deleted) return NotFound(new { message = "Review not found or not owned by you" });

            return Ok(new { message = "Review deleted successfully" });
        }

        [HttpGet("lesson-plans")]
        public async Task<ActionResult<List<object>>> GetLessonPlansForTeacher([FromQuery] string teacherId)
        {
            var userId = User.FindFirst("userId")?.Value ?? throw new UnauthorizedAccessException();
            if (string.IsNullOrWhiteSpace(teacherId))
                return BadRequest(new { message = "teacherId is required" });

            var bookings = await _bookingService.GetBookingsForStudentAsync(userId);
            var allowedStatuses = new[] { "Confirmed", "Completed" };
            var hasBooking = bookings.Any(b => b.TeacherId == teacherId && allowedStatuses.Contains(b.Status));

            if (!hasBooking)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "You can only view lesson plans for teachers you have booked." });

            var plans = await _lessonPlanService.GetByTeacherAsync(teacherId);
            var result = plans.Select(p => new
            {
                id = p.Id,
                title = p.Title,
                subject = p.Subject,
                level = p.Level,
                description = p.Description,
                scheduledDate = p.ScheduledDate,
                durationMinutes = p.DurationMinutes,
                status = p.Status
            }).ToList();

            return Ok(result);
        }

        // Progress Report endpoint
        [HttpGet("progress")]
        [HttpGet("progress-report")]
        public async Task<ActionResult<object>> GetProgressReport()
        {
            var userId = User.FindFirst("userId")?.Value ?? throw new UnauthorizedAccessException();
            
            var progress = await _studentService.GetProgressAsync(userId);
            var bookings = await _bookingService.GetBookingsForStudentAsync(userId);

            var activities = new List<ActivityItem>();

            // Recent bookings (next and last)
            foreach (var booking in bookings
                .OrderByDescending(b => b.Date)
                .Take(5))
            {
                activities.Add(new ActivityItem(
                    "booking",
                    $"{booking.Subject} class {booking.Status.ToLower()}",
                    booking.Date));
            }

            // Progress snapshots
            foreach (var item in progress.Take(3))
            {
                activities.Add(new ActivityItem(
                    "progress",
                    $"{item.Subject} average {item.AverageScore}%",
                    DateTime.UtcNow));
            }

            var overall = progress.Any() ? (int)progress.Average(p => p.AverageScore) : 0;

            return Ok(new
            {
                overallProgress = overall,
                subjectsProgress = progress.Select(p => new { subject = p.Subject, progress = p.AverageScore }).ToList(),
                activities = activities.OrderByDescending(a => a.Timestamp).ToList()
            });
        }

        private double GetDurationHours(string startTime, string endTime)
        {
            if (TimeOnly.TryParse(startTime, out var start) && TimeOnly.TryParse(endTime, out var end))
            {
                var duration = end.ToTimeSpan() - start.ToTimeSpan();
                return Math.Max(duration.TotalHours, 0);
            }

            return 0;
        }
    }

    // Request models
    public class SubmitReviewRequest
    {
        public string TeacherId { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string Comment { get; set; } = string.Empty;
    }

    public class UpdateReviewRequest
    {
        public int Rating { get; set; }
        public string Comment { get; set; } = string.Empty;
    }
}
