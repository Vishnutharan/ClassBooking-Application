using ClassBooking.API.Models;
using ClassBooking.API.Services;
using ClassBooking.API.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ClassBooking.API.Controllers
{
    [Route("api/bookings")]
    [ApiController]
    [Authorize]
    public class BookingController : ControllerBase
    {
        private readonly IBookingService _bookingService;
        private readonly ITeacherService _teacherService;
        private readonly IUserRepository _userRepository;
        private readonly ITeacherRepository _teacherRepository;

        public BookingController(
            IBookingService bookingService,
            ITeacherService teacherService,
            IUserRepository userRepository,
            ITeacherRepository teacherRepository)
        {
            _bookingService = bookingService;
            _teacherService = teacherService;
            _userRepository = userRepository;
            _teacherRepository = teacherRepository;
        }

        [HttpGet]
        public async Task<ActionResult<List<Models.ClassBooking>>> GetBookings()
        {
            var userId = User.FindFirst("userId")?.Value ?? throw new UnauthorizedAccessException();
            var role = User.FindFirst("role")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

            if (role == "Teacher")
            {
                var teacher = await EnsureTeacherProfile(userId);
                if (teacher == null)
                    return NotFound(new { message = "Teacher profile not found for current user" });

                var bookings = await _bookingService.GetBookingsForTeacherAsync(teacher.Id);
                return Ok(bookings);
            }

            if (role == "Admin")
            {
                var bookings = await _bookingService.GetAllBookingsAsync();
                return Ok(bookings);
            }

            var studentBookings = await _bookingService.GetBookingsForStudentAsync(userId);
            return Ok(studentBookings);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Models.ClassBooking>> GetBookingById(string id)
        {
            var booking = await _bookingService.GetBookingByIdAsync(id);
            if (booking == null) return NotFound();
            if (!await CanAccess(booking)) return Forbid();
            return Ok(booking);
        }

        [HttpPost]
        [Authorize(Roles = "Student")]
        public async Task<ActionResult<BookingResponse>> CreateBooking([FromBody] BookingRequest request)
        {
            var studentId = User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized();

            try
            {
                var response = await _bookingService.CreateBookingAsync(studentId, request);
                return response.Success ? Ok(response) : BadRequest(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Error creating booking" });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<BookingResponse>> UpdateBooking(string id, [FromBody] BookingRequest request)
        {
            var booking = await _bookingService.GetBookingByIdAsync(id);
            if (booking == null) return NotFound();
            if (!await CanAccess(booking)) return Forbid();
            var response = await _bookingService.UpdateBookingAsync(id, request);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        [HttpPost("{id}/confirm")]
        public async Task<ActionResult<BookingResponse>> ConfirmBooking(string id)
        {
            var booking = await _bookingService.GetBookingByIdAsync(id);
            if (booking == null) return NotFound();

            var role = User.FindFirst("role")?.Value ?? User.FindFirst(ClaimTypes.Role)?.Value;
            var userId = User.FindFirst("userId")?.Value;

            if (role == "Teacher")
            {
                var teacher = await _teacherService.GetTeacherByUserIdAsync(userId ?? string.Empty);
                if (teacher == null || booking.TeacherId != teacher.Id)
                {
                    return Forbid();
                }
            }
            else if (role != "Admin")
            {
                return Forbid();
            }

            var response = await _bookingService.ConfirmBookingAsync(id);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        [HttpPost("{id}/cancel")]
        public async Task<ActionResult<BookingResponse>> CancelBooking(string id, [FromBody] CancelRequest? request)
        {
            var booking = await _bookingService.GetBookingByIdAsync(id);
            if (booking == null) return NotFound();
            if (!await CanAccess(booking)) return Forbid();
            if (!User.IsInRole("Admin") && !await CanAccess(booking)) return Forbid();
            var response = await _bookingService.CancelBookingAsync(id, request?.Reason);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        [HttpPost("{id}/reject")]
        public async Task<ActionResult<BookingResponse>> RejectBooking(string id, [FromBody] CancelRequest? request)
        {
            var booking = await _bookingService.GetBookingByIdAsync(id);
            if (booking == null) return NotFound();

            var role = User.FindFirst("role")?.Value ?? User.FindFirst(ClaimTypes.Role)?.Value;
            var userId = User.FindFirst("userId")?.Value;

            if (role == "Teacher")
            {
                var teacher = await _teacherService.GetTeacherByUserIdAsync(userId ?? string.Empty);
                if (teacher == null || booking.TeacherId != teacher.Id)
                {
                    return Forbid();
                }
            }
            else if (role != "Admin")
            {
                return Forbid();
            }

            var response = await _bookingService.RejectBookingAsync(id, request?.Reason);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        [HttpPost("{id}/complete")]
        public async Task<ActionResult<BookingResponse>> CompleteBooking(string id)
        {
            var booking = await _bookingService.GetBookingByIdAsync(id);
            if (booking == null) return NotFound();
            if (!await CanAccess(booking, teacherOnly: true)) return Forbid();
            var response = await _bookingService.CompleteBookingAsync(id);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        [HttpPost("{id}/reschedule")]
        public async Task<ActionResult<BookingResponse>> RescheduleBooking(string id, [FromBody] RescheduleRequest request)
        {
            var booking = await _bookingService.GetBookingByIdAsync(id);
            if (booking == null) return NotFound();
            if (!await CanAccess(booking)) return Forbid();
            var response = await _bookingService.RescheduleBookingAsync(id, request.NewDate, request.NewStartTime, request.NewEndTime);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        [HttpGet("slots")]
        public async Task<ActionResult<List<string>>> GetAvailableSlots([FromQuery] string teacherId, [FromQuery] DateTime date)
        {
            var slots = await _bookingService.GetAvailableSlotsAsync(teacherId, date);
            return Ok(slots);
        }

        private async Task<bool> CanAccess(Models.ClassBooking booking, bool teacherOnly = false)
        {
            if (User.IsInRole("Admin")) return true;
            var userId = User.FindFirst("userId")?.Value;
            if (!teacherOnly && User.IsInRole("Student") && booking.StudentId == userId) return true;
            if (!User.IsInRole("Teacher") || userId == null) return false;
            var teacher = await _teacherService.GetTeacherByUserIdAsync(userId);
            return teacher != null && booking.TeacherId == teacher.Id;
        }

        private async Task<TeacherProfile?> EnsureTeacherProfile(string userId)
        {
            var teacher = await _teacherService.GetTeacherByUserIdAsync(userId);
            if (teacher != null) return teacher;

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null || !string.Equals(user.Role, "Teacher", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            var newProfile = new ClassBooking.API.Entities.TeacherProfileEntity
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

    public class CancelRequest
    {
        public string? Reason { get; set; }
    }

    public class RescheduleRequest
    {
        public DateTime NewDate { get; set; }
        public string NewStartTime { get; set; } = string.Empty;
        public string NewEndTime { get; set; } = string.Empty;
    }
}
