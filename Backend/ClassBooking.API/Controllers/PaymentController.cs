using ClassBooking.API.Models;
using ClassBooking.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ClassBooking.API.Controllers
{
    [Route("api/payments")]
    [ApiController]
    [Authorize]
    public class PaymentController : ControllerBase
    {
        private readonly IPaymentService _paymentService;
        private readonly ITeacherService _teacherService;

        public PaymentController(IPaymentService paymentService, ITeacherService teacherService)
        {
            _paymentService = paymentService;
            _teacherService = teacherService;
        }

        [HttpPost]
        public async Task<ActionResult<PaymentRecord>> ProcessPayment([FromBody] PaymentRequest request)
        {
            if (!User.IsInRole("Student")) return Forbid();
            var studentId = User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(studentId))
            {
                return Unauthorized();
            }

            try
            {
                var record = await _paymentService.ProcessPaymentAsync(studentId, request);
                return Ok(record);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Microsoft.EntityFrameworkCore.DbUpdateException)
            {
                return Conflict(new { message = "A payment is already being recorded for this booking." });
            }
        }

        [HttpGet("student")]
        public async Task<ActionResult<List<PaymentRecord>>> GetStudentPayments()
        {
            var studentId = User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(studentId))
                return Unauthorized();

            var records = await _paymentService.GetStudentPaymentsAsync(studentId);
            return Ok(records);
        }

        [HttpGet("teacher")]
        [Authorize(Roles = "Teacher")]
        public async Task<ActionResult<List<PaymentRecord>>> GetTeacherPayments()
        {
            var userId = User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var teacherProfile = await _teacherService.GetTeacherByUserIdAsync(userId);
            if (teacherProfile == null)
                return NotFound(new { message = "Teacher profile not found" });

            var records = await _paymentService.GetTeacherPaymentsAsync(teacherProfile.Id);
            return Ok(records);
        }

        [HttpGet("admin")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<PaymentRecord>>> GetAllPayments()
        {
            var records = await _paymentService.GetAllPaymentsAsync();
            return Ok(records);
        }
    }
}
