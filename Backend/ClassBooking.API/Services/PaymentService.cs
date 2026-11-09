using System.Text.Json;
using ClassBooking.API.Entities;
using ClassBooking.API.Models;
using ClassBooking.API.Repositories;

namespace ClassBooking.API.Services
{
    public interface IPaymentService
    {
        Task<PaymentRecord> ProcessPaymentAsync(string studentId, PaymentRequest request);
        Task<List<PaymentRecord>> GetStudentPaymentsAsync(string studentId);
        Task<List<PaymentRecord>> GetTeacherPaymentsAsync(string teacherId);
        Task<List<PaymentRecord>> GetAllPaymentsAsync();
    }

    public class PaymentService : IPaymentService
    {
        private readonly IFeeRepository _feeRepository;
        private readonly IBookingRepository _bookingRepository;
        private readonly IUserRepository _userRepository;
        private readonly ITeacherRepository _teacherRepository;

        public PaymentService(
            IFeeRepository feeRepository,
            IBookingRepository bookingRepository,
            IUserRepository userRepository,
            ITeacherRepository teacherRepository)
        {
            _feeRepository = feeRepository;
            _bookingRepository = bookingRepository;
            _userRepository = userRepository;
            _teacherRepository = teacherRepository;
        }

        public async Task<PaymentRecord> ProcessPaymentAsync(string studentId, PaymentRequest request)
        {
            if (!string.Equals(request.PaymentMethod, "Cash", StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("Card payments must use secure Stripe Checkout.");
            if (string.IsNullOrWhiteSpace(request.BookingId))
            {
                throw new ArgumentException("BookingId is required.");
            }

            var booking = await _bookingRepository.GetByIdAsync(request.BookingId)
                ?? throw new InvalidOperationException("Booking not found.");

            if (!string.Equals(booking.StudentId, studentId, StringComparison.OrdinalIgnoreCase))
            {
                throw new UnauthorizedAccessException("You can only pay for your own bookings.");
            }

            var student = await _userRepository.GetByIdAsync(studentId);
            var teacherProfile = await _teacherRepository.GetByIdAsync(booking.TeacherId)
                ?? await _teacherRepository.GetTeacherByUserIdAsync(booking.TeacherId);
            var teacherUser = await _userRepository.GetByIdAsync(teacherProfile?.UserId ?? booking.TeacherId);

            var durationMinutes = booking.DurationMinutes > 0
                ? booking.DurationMinutes
                : CalculateDurationMinutes(booking.StartTime, booking.EndTime);

            if (booking.Status != "Confirmed" || booking.Price <= 0)
                throw new ArgumentException("Only confirmed classes with a positive price can be paid.");
            if ((await _feeRepository.GetByBookingIdAsync(booking.Id)).Any(p => p.Status == "Paid"))
                throw new ArgumentException("This booking has already been paid.");
            var amount = booking.Price;

            var paymentStatus = string.Equals(request.PaymentMethod, "Cash", StringComparison.OrdinalIgnoreCase)
                ? "Pending"
                : "Paid";

            var transactionRef = $"CASH-{Guid.NewGuid():N}";

            var metadata = new PaymentMetadata
            {
                BookingId = booking.Id,
                Subject = booking.Subject,
                ClassType = booking.ClassType,
                GradeLevel = booking.BookingGradeLevel,
                SessionDate = booking.Date,
                StartTime = booking.StartTime,
                EndTime = booking.EndTime,
                DurationMinutes = durationMinutes,
                TeacherId = teacherProfile?.Id ?? booking.TeacherId,
                TeacherName = teacherUser?.FullName ?? teacherProfile?.FullName ?? "Teacher",
                TeacherEmail = teacherUser?.Email ?? string.Empty,
                StudentId = student?.Id ?? studentId,
                StudentName = student?.FullName ?? "Student",
                StudentEmail = student?.Email ?? string.Empty,
                PaymentMethod = request.PaymentMethod,
                Currency = string.IsNullOrWhiteSpace(request.Currency) ? "GBP" : request.Currency,
                Amount = amount,
                TransactionReference = transactionRef,
                CardSnapshot = request.Card == null ? null : new CardSnapshot
                {
                    CardholderName = request.Card.CardholderName,
                    Last4 = SafeLast4(request.Card.CardNumber),
                    Expiry = $"{request.Card.ExpiryMonth}/{request.Card.ExpiryYear}"
                }
            };

            var transaction = new FeeTransactionEntity
            {
                StudentId = studentId,
                BookingId = booking.Id,
                Amount = amount,
                Currency = metadata.Currency,
                Status = paymentStatus,
                PaymentMethod = request.PaymentMethod,
                TransactionDate = paymentStatus == "Paid" ? DateTime.UtcNow : null,
                Description = $"Payment for {booking.Subject} with {metadata.TeacherName}",
                TransactionReference = transactionRef,
                PaymentMetadataJson = JsonSerializer.Serialize(metadata),
                CreatedAt = DateTime.UtcNow
            };

            await _feeRepository.CreateAsync(transaction);

            booking.PaymentStatus = paymentStatus;
            booking.Price = amount;
            booking.DurationMinutes = durationMinutes;
            await _bookingRepository.UpdateAsync(booking);

            return await MapToRecordAsync(transaction, booking, student, teacherUser);
        }

        public async Task<List<PaymentRecord>> GetStudentPaymentsAsync(string studentId)
        {
            var payments = await _feeRepository.GetByStudentIdAsync(studentId);
            return await MapCollection(payments);
        }

        public async Task<List<PaymentRecord>> GetTeacherPaymentsAsync(string teacherId)
        {
            var payments = await _feeRepository.GetByTeacherIdAsync(teacherId);
            return await MapCollection(payments);
        }

        public async Task<List<PaymentRecord>> GetAllPaymentsAsync()
        {
            var payments = await _feeRepository.GetAllAsync();
            return await MapCollection(payments);
        }

        private async Task<List<PaymentRecord>> MapCollection(List<FeeTransactionEntity> payments)
        {
            var records = new List<PaymentRecord>();
            foreach (var payment in payments)
            {
                BookingEntity? booking = null;
                Models.User? student = null;
                Models.User? teacher = null;

                if (!string.IsNullOrEmpty(payment.BookingId))
                {
                    booking = await _bookingRepository.GetByIdAsync(payment.BookingId);
                    if (booking != null)
                    {
                        student = await _userRepository.GetByIdAsync(booking.StudentId);
                        teacher = await _userRepository.GetByIdAsync(booking.TeacherId);
                    }
                }
                else
                {
                    student = await _userRepository.GetByIdAsync(payment.StudentId);
                }

                records.Add(await MapToRecordAsync(payment, booking, student, teacher));
            }

            return records.OrderByDescending(r => r.CreatedAt).ToList();
        }

        private async Task<PaymentRecord> MapToRecordAsync(
            FeeTransactionEntity payment,
            BookingEntity? booking,
            Models.User? student,
            Models.User? teacher)
        {
            booking ??= payment.BookingId != null ? await _bookingRepository.GetByIdAsync(payment.BookingId) : null;
            student ??= await _userRepository.GetByIdAsync(payment.StudentId);
            teacher ??= booking != null ? await _userRepository.GetByIdAsync(booking.TeacherId) : null;

            var metadata = ParseMetadata(payment.PaymentMetadataJson);

            return new PaymentRecord
            {
                Id = payment.Id,
                BookingId = payment.BookingId ?? metadata.BookingId ?? string.Empty,
                StudentId = payment.StudentId,
                StudentName = metadata.StudentName ?? student?.FullName ?? "Student",
                StudentEmail = metadata.StudentEmail ?? student?.Email ?? string.Empty,
                TeacherId = metadata.TeacherId ?? booking?.TeacherId ?? teacher?.Id ?? string.Empty,
                TeacherName = metadata.TeacherName ?? teacher?.FullName ?? "Teacher",
                TeacherEmail = metadata.TeacherEmail ?? teacher?.Email ?? string.Empty,
                Subject = metadata.Subject ?? booking?.Subject ?? string.Empty,
                ClassType = metadata.ClassType ?? booking?.ClassType ?? string.Empty,
                SessionDate = metadata.SessionDate ?? booking?.Date ?? DateTime.MinValue,
                StartTime = metadata.StartTime ?? booking?.StartTime ?? string.Empty,
                EndTime = metadata.EndTime ?? booking?.EndTime ?? string.Empty,
                DurationMinutes = metadata.DurationMinutes ?? booking?.DurationMinutes ?? 0,
                PaymentMethod = payment.PaymentMethod ?? metadata.PaymentMethod ?? string.Empty,
                PaymentStatus = payment.Status,
                Amount = payment.Amount,
                Currency = payment.Currency,
                TransactionReference = payment.TransactionReference ?? metadata.TransactionReference,
                CreatedAt = payment.CreatedAt,
                PaidAt = payment.TransactionDate,
                Notes = payment.Description
            };
        }

        private static PaymentMetadata ParseMetadata(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new PaymentMetadata();

            try
            {
                return JsonSerializer.Deserialize<PaymentMetadata>(json) ?? new PaymentMetadata();
            }
            catch
            {
                return new PaymentMetadata();
            }
        }

        private static int CalculateDurationMinutes(string startTime, string endTime)
        {
            if (TimeSpan.TryParse(startTime, out var start) && TimeSpan.TryParse(endTime, out var end))
            {
                var duration = end - start;
                return Math.Max((int)duration.TotalMinutes, 0);
            }
            return 60;
        }

        private static decimal CalculatePriceFromRate(decimal? hourlyRate, int durationMinutes)
        {
            var rate = hourlyRate ?? 0;
            if (rate <= 0) return 0;
            return Math.Round(rate * (decimal)durationMinutes / 60m, 2);
        }

        private static string SafeLast4(string cardNumber)
        {
            if (string.IsNullOrWhiteSpace(cardNumber)) return string.Empty;
            var trimmed = new string(cardNumber.Where(char.IsDigit).ToArray());
            return trimmed.Length >= 4 ? trimmed[^4..] : trimmed;
        }

        private class PaymentMetadata
        {
            public string? BookingId { get; set; }
            public string? StudentId { get; set; }
            public string? StudentName { get; set; }
            public string? StudentEmail { get; set; }
            public string? TeacherId { get; set; }
            public string? TeacherName { get; set; }
            public string? TeacherEmail { get; set; }
            public string? Subject { get; set; }
            public string? ClassType { get; set; }
            public string? GradeLevel { get; set; }
            public DateTime? SessionDate { get; set; }
            public string? StartTime { get; set; }
            public string? EndTime { get; set; }
            public int? DurationMinutes { get; set; }
            public string? PaymentMethod { get; set; }
            public string? TransactionReference { get; set; }
            public string? Currency { get; set; }
            public decimal? Amount { get; set; }
            public CardSnapshot? CardSnapshot { get; set; }
        }

        private class CardSnapshot
        {
            public string? CardholderName { get; set; }
            public string? Last4 { get; set; }
            public string? Expiry { get; set; }
        }
    }
}
