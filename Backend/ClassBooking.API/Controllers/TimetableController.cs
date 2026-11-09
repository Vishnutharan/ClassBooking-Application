using ClassBooking.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ClassBooking.API.Controllers
{
    [Route("api/timetable")]
    [ApiController]
    [Authorize]
    public class TimetableController : ControllerBase
    {
        private readonly ITimetableService _timetableService;

        public TimetableController(ITimetableService timetableService)
        {
            _timetableService = timetableService;
        }

        [HttpGet]
        public async Task<IActionResult> GetTimetable([FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
        {
            // Show all events to all authenticated users (teachers/students/admins)
            var events = User.IsInRole("Admin")
                ? await _timetableService.GetEventsAsync(from, to)
                : await _timetableService.GetEventsForAudienceAsync(User.IsInRole("Teacher") ? "Teachers" : "Students", from, to);
            return Ok(events);
        }
    }
}
