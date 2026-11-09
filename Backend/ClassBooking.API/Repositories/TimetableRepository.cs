using ClassBooking.API.Data;
using ClassBooking.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClassBooking.API.Repositories
{
    public interface ITimetableRepository
    {
        Task<List<TimetableEventEntity>> GetAllAsync(DateTime? from = null, DateTime? to = null);
        Task<List<TimetableEventEntity>> GetByAudienceAsync(string audience, DateTime? from = null, DateTime? to = null);
        Task<TimetableEventEntity?> GetByIdAsync(string id);
        Task<TimetableEventEntity> CreateAsync(TimetableEventEntity entity);
        Task<TimetableEventEntity> UpdateAsync(TimetableEventEntity entity);
        Task<bool> DeleteAsync(string id);
    }

    public class TimetableRepository : ITimetableRepository
    {
        private readonly ClassBookingDbContext _context;

        public TimetableRepository(ClassBookingDbContext context)
        {
            _context = context;
        }

        public async Task<List<TimetableEventEntity>> GetAllAsync(DateTime? from = null, DateTime? to = null)
        {
            var query = _context.TimetableEvents.AsQueryable();

            if (from.HasValue)
                query = query.Where(e => e.Date.Date >= from.Value.Date);
            if (to.HasValue)
                query = query.Where(e => e.Date.Date <= to.Value.Date);

            return await query.OrderBy(e => e.Date).ThenBy(e => e.StartTime).ToListAsync();
        }

        public async Task<List<TimetableEventEntity>> GetByAudienceAsync(string audience, DateTime? from = null, DateTime? to = null)
        {
            var query = _context.TimetableEvents.AsQueryable();

            query = query.Where(e =>
                e.Audience == "All" ||
                e.Audience.ToLower() == audience.ToLower());

            if (from.HasValue)
                query = query.Where(e => e.Date.Date >= from.Value.Date);
            if (to.HasValue)
                query = query.Where(e => e.Date.Date <= to.Value.Date);

            return await query.OrderBy(e => e.Date).ThenBy(e => e.StartTime).ToListAsync();
        }

        public async Task<TimetableEventEntity?> GetByIdAsync(string id)
        {
            return await _context.TimetableEvents.FindAsync(id);
        }

        public async Task<TimetableEventEntity> CreateAsync(TimetableEventEntity entity)
        {
            _context.TimetableEvents.Add(entity);
            await _context.SaveChangesAsync();
            return entity;
        }

        public async Task<TimetableEventEntity> UpdateAsync(TimetableEventEntity entity)
        {
            entity.UpdatedAt = DateTime.UtcNow;
            _context.TimetableEvents.Update(entity);
            await _context.SaveChangesAsync();
            return entity;
        }

        public async Task<bool> DeleteAsync(string id)
        {
            var existing = await _context.TimetableEvents.FindAsync(id);
            if (existing == null) return false;

            _context.TimetableEvents.Remove(existing);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
