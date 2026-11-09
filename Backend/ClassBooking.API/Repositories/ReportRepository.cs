using System.Collections.Generic;
using System.Threading.Tasks;
using ClassBooking.API.Data;
using ClassBooking.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClassBooking.API.Repositories
{
    public interface IReportRepository
    {
        Task<List<ReportHistoryEntity>> GetAllAsync();
        Task<ReportHistoryEntity> CreateAsync(ReportHistoryEntity report);
        Task<bool> DeleteAsync(string id);
    }

    public class ReportRepository : IReportRepository
    {
        private readonly ClassBookingDbContext _context;

        public ReportRepository(ClassBookingDbContext context)
        {
            _context = context;
        }

        public async Task<List<ReportHistoryEntity>> GetAllAsync()
        {
            return await _context.ReportHistory
                .OrderByDescending(r => r.GeneratedAt)
                .ToListAsync();
        }

        public async Task<ReportHistoryEntity> CreateAsync(ReportHistoryEntity report)
        {
            _context.ReportHistory.Add(report);
            await _context.SaveChangesAsync();
            return report;
        }

        public async Task<bool> DeleteAsync(string id)
        {
            var report = await _context.ReportHistory.FindAsync(id);
            if (report == null) return false;

            _context.ReportHistory.Remove(report);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
