using ClassBooking.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Stripe;
using Stripe.Checkout;

namespace ClassBooking.API.Controllers;

[ApiController]
[Route("api/payments/stripe")]
public class StripeCheckoutController(StripeCheckoutService checkout, IConfiguration config) : ControllerBase
{
    [HttpPost("checkout")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Create(CheckoutRequest request)
    {
        try { return Ok(new { url = await checkout.CreateAsync(request.BookingId, User.FindFirst("userId")!.Value) }); }
        catch (InvalidOperationException ex) { return StatusCode(503, new { message = ex.Message }); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (StripeException) { return StatusCode(502, new { message = "Stripe could not start checkout. Please try again." }); }
    }

    [HttpPost("verify/{sessionId}")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Verify(string sessionId)
    {
        try { return Ok(new { paid = await checkout.VerifyAsync(sessionId, User.FindFirst("userId")!.Value) }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (StripeException) { return BadRequest(new { message = "Payment session could not be verified." }); }
    }

    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook()
    {
        var secret = config["Stripe:WebhookSecret"];
        if (string.IsNullOrWhiteSpace(secret)) return StatusCode(503);
        var json = await new StreamReader(Request.Body).ReadToEndAsync();
        Event stripeEvent;
        try { stripeEvent = EventUtility.ConstructEvent(json, Request.Headers["Stripe-Signature"], secret); }
        catch (StripeException) { return BadRequest(); }
        if (stripeEvent.Livemode) return BadRequest();
        if (stripeEvent.Type == "checkout.session.completed" && stripeEvent.Data.Object is Session session)
            await checkout.VerifyAsync(session.Id);
        return Ok();
    }
}

public record CheckoutRequest(string BookingId);
