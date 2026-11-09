using System.Data;
using ClassBooking.API.Data;
using ClassBooking.API.Entities;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;

namespace ClassBooking.API.Services;

public class StripeCheckoutService(ClassBookingDbContext db, IConfiguration config)
{
    private SessionService Sessions()
    {
        var key = config["Stripe:SecretKey"];
        if (string.IsNullOrEmpty(key) || !key.StartsWith("sk_test_"))
            throw new InvalidOperationException("Stripe test payments are not configured. Set Stripe:SecretKey to your test secret key.");
        return new SessionService(new StripeClient(key));
    }

    public async Task<string> CreateAsync(string bookingId, string studentId)
    {
        var sessions = Sessions();
        return await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            db.ChangeTracker.Clear();
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var booking = await db.Bookings.SingleOrDefaultAsync(b => b.Id == bookingId && b.StudentId == studentId)
                ?? throw new ArgumentException("Booking not found.");
            if (booking.Status != "Confirmed" || booking.Price <= 0)
                throw new ArgumentException("Only confirmed classes with a positive price can be paid online.");
            var payments = await db.FeeTransactions.Where(p => p.BookingId == booking.Id).ToListAsync();
            if (payments.Any(p => p.Status == "Paid")) throw new ArgumentException("This booking has already been paid.");
            var previous = payments.FirstOrDefault(p => p.Status == "Pending" && p.PaymentMethod == "Card");
            if (previous?.TransactionReference is { } sessionId)
            {
                var existing = await sessions.GetAsync(sessionId);
                if (existing.Status == "open") return existing.Url;
                if (existing.PaymentStatus == "paid") throw new ArgumentException("Payment received. Please refresh your bookings shortly.");
                previous.Status = "Expired";
            }
            var origin = (config["Stripe:FrontendUrl"] ?? "http://localhost:4200").TrimEnd('/');
            var fee = new FeeTransactionEntity { StudentId = studentId, BookingId = booking.Id,
                Amount = booking.Price, Currency = "GBP", Status = "Pending", PaymentMethod = "Card",
                Description = $"Stripe test payment for {booking.Subject}", CreatedAt = DateTime.UtcNow };
            var session = await sessions.CreateAsync(new SessionCreateOptions
            {
                Mode = "payment", ClientReferenceId = booking.Id,
                SuccessUrl = origin + "/payment/" + booking.Id + "?session_id={CHECKOUT_SESSION_ID}",
                CancelUrl = origin + "/payment/" + booking.Id + "?cancelled=true",
                Metadata = new() { ["bookingId"] = booking.Id, ["studentId"] = studentId },
                LineItems = new() { new SessionLineItemOptions { Quantity = 1, PriceData = new SessionLineItemPriceDataOptions {
                    Currency = "GBP", UnitAmount = checked((long)decimal.Round(booking.Price * 100, 0)),
                    ProductData = new SessionLineItemPriceDataProductDataOptions { Name = booking.Subject + " class" }
                } } }
            }, new RequestOptions { IdempotencyKey = "classbooking-" + fee.Id });
            fee.TransactionReference = session.Id;
            db.FeeTransactions.Add(fee);
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
            return session.Url;
        });
    }

    public async Task<bool> VerifyAsync(string sessionId, string? studentId = null)
    {
        var session = await Sessions().GetAsync(sessionId);
        if (session.Livemode) throw new ArgumentException("Only Stripe test payments are accepted.");
        if (studentId != null && (!session.Metadata.TryGetValue("studentId", out var owner) || owner != studentId))
            throw new UnauthorizedAccessException();
        if (session.PaymentStatus != "paid") return false;
        return await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            db.ChangeTracker.Clear();
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var fee = await db.FeeTransactions.SingleOrDefaultAsync(p => p.TransactionReference == session.Id)
                ?? throw new ArgumentException("Payment session is not linked to a booking.");
            if (fee.Status == "Paid") return true;
            if (session.AmountTotal != (long)decimal.Round(fee.Amount * 100, 0) || session.Currency != "gbp")
                throw new ArgumentException("Payment amount or currency does not match the booking.");
            var booking = await db.Bookings.SingleAsync(b => b.Id == fee.BookingId);
            fee.Status = "Paid";
            fee.TransactionDate = DateTime.UtcNow;
            booking.PaymentStatus = "Paid";
            booking.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
            return true;
        });
    }
}
