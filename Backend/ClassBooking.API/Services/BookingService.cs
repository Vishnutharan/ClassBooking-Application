using ClassBooking.API.Models;
using ClassBooking.API.Entities;
using ClassBooking.API.Repositories;
using System.Text.Json;
using System.Data;
using ClassBooking.API.Data;
using Microsoft.EntityFrameworkCore;

namespace ClassBooking.API.Services
{
    public interface IBookingService
    {
        Task<List<Models.ClassBooking>> GetBookingsForStudentAsync(string studentId);
        Task<List<Models.ClassBooking>> GetBookingsForTeacherAsync(string teacherId);
        Task<Models.ClassBooking?> GetBookingByIdAsync(string id);
        Task<List<Models.ClassBooking>> GetAllBookingsAsync();
        Task<BookingResponse> CreateBookingAsync(string studentId, BookingRequest request);
        Task<BookingResponse> UpdateBookingAsync(string id, BookingRequest request);
        Task<BookingResponse> ConfirmBookingAsync(string id);
        Task<BookingResponse> CancelBookingAsync(string id, string? reason);
        Task<BookingResponse> CompleteBookingAsync(string id);
        Task<List<string>> GetAvailableSlotsAsync(string teacherId, DateTime date);
        Task<BookingResponse> RescheduleBookingAsync(string id, DateTime newDate, string newStartTime, string newEndTime);
        Task<BookingResponse> RejectBookingAsync(string id, string? reason);
    }

    public class BookingService : IBookingService
    {
        private readonly ClassBookingDbContext _context;
        private readonly IBookingRepository _bookingRepository;
        private readonly ITeacherRepository _teacherRepository;
        private readonly INotificationRepository _notificationRepository;
        private readonly IEmailService _emailService;
        private readonly IStudentRepository _studentRepository;
        private readonly IUserRepository _userRepository;

        public BookingService(
            IBookingRepository bookingRepository,
            ITeacherRepository teacherRepository,
            INotificationRepository notificationRepository,
            IEmailService emailService,
            IUserRepository userRepository,
            IStudentRepository studentRepository,
            ClassBookingDbContext context)
        {
            _context = context;
            _bookingRepository = bookingRepository;
            _teacherRepository = teacherRepository;
            _notificationRepository = notificationRepository;
            _emailService = emailService;
            _userRepository = userRepository;
            _studentRepository = studentRepository;
        }

        public async Task<List<Models.ClassBooking>> GetBookingsForStudentAsync(string studentId)
        {
            var bookings = await _bookingRepository.GetByStudentIdAsync(studentId);
            var dtos = new List<Models.ClassBooking>();
            
            foreach (var booking in bookings)
            {
                var dto = MapToDto(booking);
                var teacher = await GetTeacherUser(booking.TeacherId);
                var student = await _userRepository.GetByIdAsync(booking.StudentId);
                dto.TeacherName = teacher?.FullName ?? "Unknown";
                dto.StudentName = student?.FullName ?? "Unknown";
                dtos.Add(dto);
            }
            return dtos;
        }

        public async Task<List<Models.ClassBooking>> GetBookingsForTeacherAsync(string teacherId)
        {
            var bookings = await _bookingRepository.GetByTeacherIdAsync(teacherId);
            var dtos = new List<Models.ClassBooking>();

            foreach (var booking in bookings)
            {
                var dto = MapToDto(booking);
                var student = await _userRepository.GetByIdAsync(booking.StudentId);
                var teacher = await GetTeacherUser(booking.TeacherId);
                dto.StudentName = student?.FullName ?? "Unknown";
                dto.TeacherName = teacher?.FullName ?? "Unknown";
                dtos.Add(dto);
            }
            return dtos;
        }

        public async Task<Models.ClassBooking?> GetBookingByIdAsync(string id)
        {
            var booking = await _bookingRepository.GetByIdAsync(id);
            if (booking == null) return null;

            var dto = MapToDto(booking);
            var student = await _userRepository.GetByIdAsync(booking.StudentId);
            var teacher = await GetTeacherUser(booking.TeacherId);
            dto.StudentName = student?.FullName ?? "Unknown";
            dto.TeacherName = teacher?.FullName ?? "Unknown";
            
            return dto;
        }

        public async Task<List<Models.ClassBooking>> GetAllBookingsAsync()
        {
            var bookings = await _bookingRepository.GetAllAsync();
            var dtos = new List<Models.ClassBooking>();

            foreach (var booking in bookings)
            {
                var dto = MapToDto(booking);
                var student = await _userRepository.GetByIdAsync(booking.StudentId);
                var teacher = await GetTeacherUser(booking.TeacherId);
                dto.StudentName = student?.FullName ?? "Unknown";
                dto.TeacherName = teacher?.FullName ?? "Unknown";
                dtos.Add(dto);
            }
            return dtos;
        }

        public Task<BookingResponse> CreateBookingAsync(string studentId, BookingRequest request) =>
            InTransaction(() => CreateBookingCoreAsync(studentId, request));

        private async Task<BookingResponse> CreateBookingCoreAsync(string studentId, BookingRequest request)
        {
            if (!ValidTime(request.Date, request.StartTime, request.EndTime) || string.IsNullOrWhiteSpace(request.Subject) || (request.Mode != "ONLINE" && request.Mode != "IN_PERSON"))
                return new BookingResponse { Success = false, Status = "Invalid", Message = "Choose a future date, valid start/end times, subject and teaching mode." };
            var teacherProfile = await _teacherRepository.GetByIdAsync(request.TeacherId);
            if (teacherProfile == null || !teacherProfile.IsAvailable)
            {
                return new BookingResponse
                {
                    Success = false,
                    Message = "Selected teacher not found",
                    Status = "Error"
                };
            }

            // Ensure the exact slot is present or auto-create it if free
            var slot = await _teacherRepository.GetAvailabilitySlotAsync(request.TeacherId, request.Date, request.StartTime, request.EndTime);
            if (slot == null)
            {
                slot = await _teacherRepository.AddAvailabilitySlotAsync(new TeacherAvailabilitySlotEntity
                {
                    TeacherProfileId = request.TeacherId,
                    Date = request.Date.Date,
                    StartTime = request.StartTime,
                    EndTime = request.EndTime,
                    Status = "Available"
                });
            }
            else if (!string.Equals(slot.Status, "Available", StringComparison.OrdinalIgnoreCase))
            {
                return new BookingResponse
                {
                    Success = false,
                    Message = "The selected slot is no longer available.",
                    Status = "Unavailable"
                };
            }

            // Guard against overlapping bookings on the same slot for this teacher
            var conflicting = (await _bookingRepository.GetByTeacherIdAsync(request.TeacherId))
                .Any(b => b.Date.Date == request.Date.Date &&
                          Overlaps(b.StartTime, b.EndTime, request.StartTime, request.EndTime) &&
                          (b.Status == "Pending" || b.Status == "Confirmed"));
            if (conflicting)
            {
                return new BookingResponse
                {
                    Success = false,
                    Message = "This slot has just been taken by another student.",
                    Status = "Unavailable"
                };
            }

            if ((await _bookingRepository.GetByStudentIdAsync(studentId)).Any(b => b.Date.Date == request.Date.Date && (b.Status == "Pending" || b.Status == "Confirmed") && Overlaps(b.StartTime, b.EndTime, request.StartTime, request.EndTime)))
                return new BookingResponse { Success = false, Status = "Unavailable", Message = "You already have a class at this time." };
            var student = await _userRepository.GetByIdAsync(studentId);
            
            // --- Update Student Profile with new details ---


            // Update Student Profile with new details if provided
            try
            {
                var profile = await _studentRepository.GetByUserIdAsync(studentId);
                if (profile != null)
                {
                    bool updated = false;
                    if (!string.IsNullOrEmpty(request.School) && profile.School != request.School)
                    {
                        profile.School = request.School;
                        updated = true;
                    }

                    if (!string.IsNullOrEmpty(request.ParentName) || !string.IsNullOrEmpty(request.ParentContact))
                    {
                        var guardianInfo = new { name = request.ParentName, contact = request.ParentContact };
                        var json = System.Text.Json.JsonSerializer.Serialize(guardianInfo);
                        if (profile.GuardianInfoJson != json)
                        {
                            profile.GuardianInfoJson = json;
                            updated = true;
                        }
                    }

                    if (updated)
                    {
                        await _studentRepository.UpdateAsync(profile);
                    }
                }
            }
            catch (Exception ex)
            {
                // Log warning but don't fail booking
                Console.WriteLine($"Failed to update student profile: {ex.Message}");
            }

            var durationMinutes = CalculateDurationInMinutes(request.StartTime, request.EndTime);
            var price = teacherProfile.HourlyRate > 0 && durationMinutes > 0
                ? Math.Round((decimal)durationMinutes * teacherProfile.HourlyRate / 60m, 2)
                : 0;

            var booking = new BookingEntity
            {
                Id = Guid.NewGuid().ToString(),
                StudentId = studentId,
                TeacherId = request.TeacherId,
                Subject = request.Subject,
                Date = request.Date.Date,
                StartTime = request.StartTime,
                EndTime = request.EndTime,
                DurationMinutes = durationMinutes > 0 ? durationMinutes : 60,
                Price = price,
                Status = "Pending",
                ClassType = request.ClassType,
                BookingGradeLevel = request.BookingGradeLevel ?? (await _studentRepository.GetByUserIdAsync(studentId))?.GradeLevel ?? "OLevel",
                Notes = request.Notes,
                Mode = request.Mode,
                LocationOrLink = request.Mode == "ONLINE"
                    ? (teacherProfile.MeetingLink ?? "To be shared")
                    : (teacherProfile.LocationAddress ?? "To be decided"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _bookingRepository.CreateAsync(booking);
            await _teacherRepository.UpdateAvailabilitySlotStatusAsync(slot.Id, "Pending", booking.Id);

            // Create notification for teacher
            await _notificationRepository.CreateAsync(new NotificationEntity
            {
                UserId = teacherProfile.UserId,
                Type = "NewBooking",
                Title = "New Booking Request",
                Message = $"New booking request from {student?.FullName ?? "Student"} for {request.Subject} on {request.Date:yyyy-MM-dd} at {request.StartTime}",
                RelatedEntityId = booking.Id,
                CreatedAt = DateTime.UtcNow
            });

            // Send Email to Teacher
            var teacher = await GetTeacherUser(request.TeacherId);
            if (teacher != null)
            {
                await _emailService.SendEmailAsync(teacher.Email, "New Booking Request", 
                    $"You have a new booking request from {student?.FullName ?? "a student"} for {request.Subject} on {request.Date:yyyy-MM-dd} at {request.StartTime}. Student contact: {student?.Email ?? "N/A"}");
            }

            return new BookingResponse
            {
                Success = true,
                Id = booking.Id,
                Status = booking.Status,
                Message = "Booking created successfully"
            };
        }

        public Task<BookingResponse> UpdateBookingAsync(string id, BookingRequest request) =>
            InTransaction(() => UpdateBookingCoreAsync(id, request));

        private async Task<BookingResponse> UpdateBookingCoreAsync(string id, BookingRequest request)
        {
            var booking = await _bookingRepository.GetByIdAsync(id);
            if (booking == null)
                return new BookingResponse { Id = id, Status = "Error", Message = "Booking not found", Success = false };
            if (booking.Status != "Pending" && booking.Status != "Confirmed")
                return new BookingResponse { Id = id, Status = booking.Status, Success = false, Message = "This action is not allowed for the current booking status." };
            // Changing date/time should go through reschedule to manage slot locks
            if (booking.Date.Date != request.Date.Date || booking.StartTime != request.StartTime || booking.EndTime != request.EndTime)
            {
                return new BookingResponse { Id = id, Status = "Error", Message = "Please use reschedule to change the time slot", Success = false };
            }

            booking.Subject = request.Subject;
            booking.Date = request.Date;
            booking.StartTime = request.StartTime;
            booking.EndTime = request.EndTime;
            booking.Notes = request.Notes;

            await _bookingRepository.UpdateAsync(booking);

            return new BookingResponse
            {
                Success = true,
                Id = booking.Id,
                Status = booking.Status,
                Message = "Booking updated successfully"
            };
        }

        public Task<BookingResponse> ConfirmBookingAsync(string id) =>
            InTransaction(() => ConfirmBookingCoreAsync(id));

        private async Task<BookingResponse> ConfirmBookingCoreAsync(string id)
        {
            var booking = await _bookingRepository.GetByIdAsync(id);
            if (booking == null)
                return new BookingResponse { Id = id, Status = "Error", Message = "Booking not found", Success = false };
            if (booking.Status != "Pending")
                return new BookingResponse { Id = id, Status = booking.Status, Success = false, Message = "This action is not allowed for the current booking status." };


            booking.Status = "Confirmed";
            await _bookingRepository.UpdateAsync(booking);

            var slot = await _teacherRepository.GetAvailabilitySlotByBookingAsync(id);
            if (slot != null)
            {
                await _teacherRepository.UpdateAvailabilitySlotStatusAsync(slot.Id, "Booked", booking.Id);
            }

            // Notify student
            await _notificationRepository.CreateAsync(new NotificationEntity
            {
                UserId = booking.StudentId,
                Type = "BookingConfirmed",
                Title = "Booking Confirmed",
                Message = $"Your booking for {booking.Subject} on {booking.Date:yyyy-MM-dd} has been confirmed",
                RelatedEntityId = booking.Id,
                CreatedAt = DateTime.UtcNow
            });

            // Send Email to Student
            var student = await _userRepository.GetByIdAsync(booking.StudentId);
            if (student != null)
            {
                await _emailService.SendEmailAsync(student.Email, "Booking Confirmed", 
                    $"Your booking for {booking.Subject} on {booking.Date:yyyy-MM-dd} at {booking.StartTime} has been confirmed.");
            }

            return new BookingResponse
            {
                Success = true,
                Id = booking.Id,
                Status = booking.Status,
                Message = "Booking confirmed"
            };
        }

        public Task<BookingResponse> CancelBookingAsync(string id, string? reason) =>
            InTransaction(() => CancelBookingCoreAsync(id, reason));

        private async Task<BookingResponse> CancelBookingCoreAsync(string id, string? reason)
        {
            var booking = await _bookingRepository.GetByIdAsync(id);
            if (booking == null)
                return new BookingResponse { Id = id, Status = "Error", Message = "Booking not found", Success = false };
            if (booking.Status != "Pending" && booking.Status != "Confirmed")
                return new BookingResponse { Id = id, Status = booking.Status, Success = false, Message = "This action is not allowed for the current booking status." };
            if (booking.PaymentStatus == "Paid")
                return new BookingResponse { Id = id, Status = booking.Status, Success = false, Message = "This booking has a recorded payment. Contact support to arrange a refund before cancelling." };


            booking.Status = "Cancelled";
            booking.CancellationReason = reason;
            await _bookingRepository.UpdateAsync(booking);

            await _teacherRepository.ReleaseSlotByBookingAsync(id);

            // Notify both parties
            await _notificationRepository.CreateAsync(new NotificationEntity
            {
                UserId = booking.StudentId,
                Type = "BookingCancelled",
                Title = "Booking Cancelled",
                Message = $"Your booking for {booking.Subject} on {booking.Date:yyyy-MM-dd} has been cancelled",
                RelatedEntityId = booking.Id,
                CreatedAt = DateTime.UtcNow
            });

            // Send Email to Student
            var student = await _userRepository.GetByIdAsync(booking.StudentId);
            if (student != null)
            {
                await _emailService.SendEmailAsync(student.Email, "Booking Cancelled", 
                    $"Your booking for {booking.Subject} on {booking.Date:yyyy-MM-dd} has been cancelled. Reason: {reason}");
            }

            // Send Email to Teacher (if cancelled by student) - Logic could be refined based on who cancelled
            var teacher = await GetTeacherUser(booking.TeacherId);
            if (teacher != null)
            {
                await _emailService.SendEmailAsync(teacher.Email, "Booking Cancelled", 
                    $"The booking for {booking.Subject} on {booking.Date:yyyy-MM-dd} has been cancelled. Reason: {reason}");
            }

            return new BookingResponse
            {
                Success = true,
                Id = booking.Id,
                Status = booking.Status,
                Message = "Booking cancelled"
            };
        }

        public Task<BookingResponse> RejectBookingAsync(string id, string? reason) =>
            InTransaction(() => RejectBookingCoreAsync(id, reason));

        private async Task<BookingResponse> RejectBookingCoreAsync(string id, string? reason)
        {
            var booking = await _bookingRepository.GetByIdAsync(id);
            if (booking == null)
                return new BookingResponse { Id = id, Status = "Error", Message = "Booking not found", Success = false };
            if (booking.Status != "Pending")
                return new BookingResponse { Id = id, Status = booking.Status, Success = false, Message = "This action is not allowed for the current booking status." };


            booking.Status = "Rejected";
            booking.CancellationReason = reason;
            await _bookingRepository.UpdateAsync(booking);
            await _teacherRepository.ReleaseSlotByBookingAsync(id);

            await _notificationRepository.CreateAsync(new NotificationEntity
            {
                UserId = booking.StudentId,
                Type = "BookingRejected",
                Title = "Booking Rejected",
                Message = $"Your booking for {booking.Subject} on {booking.Date:yyyy-MM-dd} was rejected. {reason}",
                RelatedEntityId = booking.Id,
                CreatedAt = DateTime.UtcNow
            });

            var student = await _userRepository.GetByIdAsync(booking.StudentId);
            if (student != null)
            {
                await _emailService.SendEmailAsync(student.Email, "Booking Rejected",
                    $"Your booking for {booking.Subject} on {booking.Date:yyyy-MM-dd} was rejected by the teacher. {reason}");
            }

            return new BookingResponse
            {
                Success = true,
                Id = booking.Id,
                Status = booking.Status,
                Message = "Booking rejected and slot released"
            };
        }

        public Task<BookingResponse> CompleteBookingAsync(string id) =>
            InTransaction(() => CompleteBookingCoreAsync(id));

        private async Task<BookingResponse> CompleteBookingCoreAsync(string id)
        {
            var booking = await _bookingRepository.GetByIdAsync(id);
            if (booking == null)
                return new BookingResponse { Id = id, Status = "Error", Message = "Booking not found", Success = false };
            if (booking.Status != "Confirmed")
                return new BookingResponse { Id = id, Status = booking.Status, Success = false, Message = "This action is not allowed for the current booking status." };


            if (booking.Date.Date.Add(TimeSpan.Parse(booking.EndTime)) > DateTime.UtcNow)
                return new BookingResponse { Id = id, Success = false, Status = booking.Status, Message = "A class can only be completed after its end time." };
            booking.Status = "Completed";
            await _bookingRepository.UpdateAsync(booking);

            return new BookingResponse
            {
                Success = true,
                Id = booking.Id,
                Status = booking.Status,
                Message = "Booking marked as completed"
            };
        }

        public async Task<List<string>> GetAvailableSlotsAsync(string teacherId, DateTime date)
        {
            var slots = await _teacherRepository.GetAvailabilitySlotsAsync(teacherId, date.Date, date.Date);

            // Filter slots that are still free (status-based lock)
            return slots
                .Where(s => string.Equals(s.Status, "Available", StringComparison.OrdinalIgnoreCase))
                .Select(s => $"{s.StartTime}-{s.EndTime}")
                .ToList();
        }

        public Task<BookingResponse> RescheduleBookingAsync(string id, DateTime newDate, string newStartTime, string newEndTime) =>
            InTransaction(() => RescheduleBookingCoreAsync(id, newDate, newStartTime, newEndTime));

        private async Task<BookingResponse> RescheduleBookingCoreAsync(string id, DateTime newDate, string newStartTime, string newEndTime)
        {
            var booking = await _bookingRepository.GetByIdAsync(id);
            if (booking == null)
                return new BookingResponse { Id = id, Status = "Error", Message = "Booking not found", Success = false };
            if (booking.Status != "Pending" && booking.Status != "Confirmed")
                return new BookingResponse { Id = id, Status = booking.Status, Success = false, Message = "This action is not allowed for the current booking status." };
            if (booking.PaymentStatus == "Paid")
                return new BookingResponse { Id = id, Status = booking.Status, Success = false, Message = "This paid booking cannot be rescheduled online. Contact support first." };


            if (!ValidTime(newDate, newStartTime, newEndTime))
                return new BookingResponse { Id = id, Success = false, Status = "Invalid", Message = "Choose a future date and valid times." };
            if (CalculateDurationInMinutes(newStartTime, newEndTime) != booking.DurationMinutes)
                return new BookingResponse { Id = id, Success = false, Status = "Invalid", Message = "Rescheduling must preserve the booked duration and price." };
            var targetSlot = await _teacherRepository.GetAvailabilitySlotAsync(booking.TeacherId, newDate, newStartTime, newEndTime);
            if (targetSlot == null || !string.Equals(targetSlot.Status, "Available", StringComparison.OrdinalIgnoreCase))
            {
                return new BookingResponse { Id = id, Status = "Unavailable", Message = "New slot is not available", Success = false };
            }

            var conflicts = (await _bookingRepository.GetByTeacherIdAsync(booking.TeacherId))
                .Any(b => b.Id != id &&
                          b.Date.Date == newDate.Date &&
                          Overlaps(b.StartTime, b.EndTime, newStartTime, newEndTime) &&
                          (b.Status == "Pending" || b.Status == "Confirmed"));
            if (conflicts)
            {
                return new BookingResponse { Id = id, Status = "Unavailable", Message = "Another student already requested this time", Success = false };
            }

            if ((await _bookingRepository.GetByStudentIdAsync(booking.StudentId)).Any(b => b.Id != id && b.Date.Date == newDate.Date && (b.Status == "Pending" || b.Status == "Confirmed") && Overlaps(b.StartTime, b.EndTime, newStartTime, newEndTime)))
                return new BookingResponse { Id = id, Success = false, Status = "Unavailable", Message = "You already have a class at this time." };
            // Release existing slot lock if any
            var existingSlot = await _teacherRepository.GetAvailabilitySlotByBookingAsync(id);
            if (existingSlot != null)
            {
                await _teacherRepository.UpdateAvailabilitySlotStatusAsync(existingSlot.Id, "Available", null);
            }

            booking.Date = newDate.Date;
            booking.StartTime = newStartTime;
            booking.EndTime = newEndTime;
            booking.Status = "Pending";
            await _bookingRepository.UpdateAsync(booking);
            await _teacherRepository.UpdateAvailabilitySlotStatusAsync(targetSlot.Id, "Pending", booking.Id);

            // Notify both parties
            await _notificationRepository.CreateAsync(new NotificationEntity
            {
                UserId = booking.StudentId,
                Type = "BookingRescheduled",
                Title = "Booking Rescheduled",
                Message = $"Your booking has been rescheduled to {newDate:yyyy-MM-dd} at {newStartTime}. Waiting for teacher confirmation.",
                RelatedEntityId = booking.Id,
                CreatedAt = DateTime.UtcNow
            });

            await _notificationRepository.CreateAsync(new NotificationEntity
            {
                UserId = (await GetTeacherUser(booking.TeacherId))!.Id,
                Type = "BookingRescheduled",
                Title = "Booking Reschedule Request",
                Message = $"Student requested to move {booking.Subject} to {newDate:yyyy-MM-dd} at {newStartTime}",
                RelatedEntityId = booking.Id,
                CreatedAt = DateTime.UtcNow
            });

            // Send Email to Student
            var student = await _userRepository.GetByIdAsync(booking.StudentId);
            if (student != null)
            {
                await _emailService.SendEmailAsync(student.Email, "Booking Rescheduled", 
                    $"Your booking has been rescheduled to {newDate:yyyy-MM-dd} at {newStartTime}.");
            }

            return new BookingResponse
            {
                Success = true,
                Id = booking.Id,
                Status = booking.Status,
                Message = "Booking rescheduled successfully and awaiting confirmation"
            };
        }

        private async Task<BookingResponse> InTransaction(Func<Task<BookingResponse>> action)
        {
            return await _context.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
            {
                _context.ChangeTracker.Clear();
                await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
                var result = await action();
                if (result.Success) await transaction.CommitAsync();
                return result;
            });
        }

        private async Task<User?> GetTeacherUser(string profileId)
        {
            var profile = await _teacherRepository.GetByIdAsync(profileId);
            return await _userRepository.GetByIdAsync(profile?.UserId ?? profileId);
        }

        private static bool ValidTime(DateTime date, string startText, string endText) =>
            TimeOnly.TryParse(startText, out var start) && TimeOnly.TryParse(endText, out var end) &&
            end > start && date.Date.Add(start.ToTimeSpan()) > DateTime.UtcNow;

        private static bool Overlaps(string startA, string endA, string startB, string endB) =>
            TimeOnly.TryParse(startA, out var a) && TimeOnly.TryParse(endA, out var b) &&
            TimeOnly.TryParse(startB, out var c) && TimeOnly.TryParse(endB, out var d) && a < d && c < b;

        private Models.ClassBooking MapToDto(BookingEntity entity)
        {
            return new Models.ClassBooking
            {
                Id = entity.Id,
                StudentId = entity.StudentId,
                TeacherId = entity.TeacherId,
                Subject = entity.Subject,
                Date = entity.Date,
                StartTime = entity.StartTime,
                EndTime = entity.EndTime,
                Status = entity.Status,
                PaymentStatus = entity.PaymentStatus,
                ClassType = entity.ClassType,
                Mode = entity.Mode,
                LocationOrLink = entity.LocationOrLink,
                DurationMinutes = entity.DurationMinutes,
                Price = entity.Price,
                BookingGradeLevel = entity.BookingGradeLevel,
                RecurringDays = !string.IsNullOrEmpty(entity.RecurringDaysJson) 
                    ? JsonSerializer.Deserialize<List<string>>(entity.RecurringDaysJson) 
                    : null,
                Notes = entity.Notes,
                MeetingLink = entity.MeetingLink,
                CreatedAt = entity.CreatedAt,
                UpdatedAt = entity.UpdatedAt
            };
        }

        private int CalculateDurationInMinutes(string startTime, string endTime)
        {
            if (TimeSpan.TryParse(startTime, out var start) && TimeSpan.TryParse(endTime, out var end))
            {
                var duration = end - start;
                return Math.Max((int)duration.TotalMinutes, 0);
            }
            return 60;
        }
    }
}

