using System.Text;
using ClassBooking.API.Repositories;
using ClassBooking.API.Models;

namespace ClassBooking.API.Services;

public class AdminReportExportService(IUserRepository users, IBookingRepository bookings, IFeeRepository fees)
{
    public async Task<(byte[] Content, string ContentType, string Extension)> ExportAsync(string report, string format)
    {
        var headers = new List<string>();
        var rows = new List<List<string>>();
        switch (report.ToLowerInvariant())
        {
            case "bookings":
                headers = ["Booking ID", "Student ID", "Teacher ID", "Subject", "Date", "Start", "End", "Status", "Payment", "Price", "Currency"];
                rows = (await bookings.GetAllAsync()).Select(b => new List<string> { b.Id, b.StudentId, b.TeacherId, b.Subject, b.Date.ToString("yyyy-MM-dd"), b.StartTime, b.EndTime, b.Status, b.PaymentStatus, b.Price.ToString("0.00"), "GBP" }).ToList();
                break;
            case "users":
                headers = ["User ID", "Name", "Email", "Role", "Status", "Created"];
                rows = (await users.GetAllUsersAsync()).Select(u => new List<string> { u.Id, u.FullName, u.Email, u.Role, u.Status, u.CreatedAt.ToString("O") }).ToList();
                break;
            case "revenue":
                headers = ["Payment ID", "Booking ID", "Student ID", "Method", "Status", "Amount", "Currency", "Created"];
                rows = (await fees.GetAllAsync()).Select(p => new List<string> { p.Id, p.BookingId ?? "", p.StudentId, p.PaymentMethod ?? "", p.Status, p.Amount.ToString("0.00"), p.Currency, p.CreatedAt.ToString("O") }).ToList();
                break;
            default: throw new ArgumentException("Unknown report type.");
        }
        if (format.Equals("excel", StringComparison.OrdinalIgnoreCase) || format.Equals("csv", StringComparison.OrdinalIgnoreCase))
        {
            var csv = string.Join("\r\n", new[] { headers }.Concat(rows).Select(row => string.Join(",", row.Select(EscapeCsv))));
            return (new UTF8Encoding(true).GetBytes(csv), "text/csv; charset=utf-8", "csv");
        }
        if (!format.Equals("pdf", StringComparison.OrdinalIgnoreCase)) throw new ArgumentException("Format must be pdf or excel.");
        var lines = new[] { report + " Report - " + DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm UTC"), string.Join(" | ", headers) }
            .Concat(rows.Select(r => string.Join(" | ", r))).Select(s => s.Length > 110 ? s[..110] : s).Take(48).ToList();
        return (MakePdf(lines), "application/pdf", "pdf");
    }

    private static string EscapeCsv(string value)
    {
        if (value.Length > 0 && "=+-@\t\r".Contains(value[0])) value = "'" + value;
        return "\"" + value.Replace("\"", "\"\"") + "\"";
    }

    private static byte[] MakePdf(List<string> lines)
    {
        string PdfText(string s) => Convert.ToHexString(Encoding.Latin1.GetBytes(s));
        var stream = new StringBuilder("BT /F1 8 Tf 40 800 Td 10 TL\n");
        foreach (var line in lines) stream.Append('<').Append(PdfText(line)).Append("> Tj T*\n");
        stream.Append("ET");
        var objects = new[] { "<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", $"<< /Length {Encoding.ASCII.GetByteCount(stream.ToString())} >>\nstream\n{stream}\nendstream" };
        var pdf = new StringBuilder("%PDF-1.4\n"); var offsets = new List<int> { 0 };
        for (var i = 0; i < objects.Length; i++) { offsets.Add(Encoding.ASCII.GetByteCount(pdf.ToString())); pdf.Append($"{i + 1} 0 obj\n{objects[i]}\nendobj\n"); }
        var xref = Encoding.ASCII.GetByteCount(pdf.ToString()); pdf.Append($"xref\n0 {offsets.Count}\n0000000000 65535 f \n");
        foreach (var offset in offsets.Skip(1)) pdf.Append(offset.ToString("D10")).Append(" 00000 n \n");
        pdf.Append($"trailer\n<< /Size {offsets.Count} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF");
        return Encoding.ASCII.GetBytes(pdf.ToString());
    }
}
