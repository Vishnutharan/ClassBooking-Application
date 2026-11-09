using ClassBooking.API.Data;
using ClassBooking.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClassBooking.API.Repositories
{
    public class ResourceRepository : IResourceRepository
    {
        private readonly ClassBookingDbContext _context;

        public ResourceRepository(ClassBookingDbContext context)
        {
            _context = context;
        }

        public async Task<ResourceEntity> CreateAsync(ResourceEntity resource)
        {
            await _context.Resources.AddAsync(resource);
            await _context.SaveChangesAsync();
            return resource;
        }

        public async Task<List<ResourceEntity>> GetByTeacherAsync(string teacherId)
        {
            return await _context.Resources
                .Where(r => r.TeacherProfileId == teacherId)
                .OrderByDescending(r => r.UploadedAt)
                .ToListAsync();
        }

        public async Task<List<ResourceEntity>> GetByStudentAsync(string studentId)
        {
            // Get resources specifically assigned to this student OR public resources (if logic requires, but per requirement "specific students", so filtering by StudentId)
            // Also assuming resources where StudentId is null might be "General" resources? For now, implementing retrieval of resources specifically for this student.
            // If the user wants general resources too, we can add `|| r.StudentId == null`. 
            // Based on "Upload Resources that specifc students has to get", strict filtering seems appropriate.
            
            return await _context.Resources
                .Where(r => r.StudentId == studentId || r.IsPublic ||
                    _context.StudentProfiles.Any(s => s.Id == studentId && s.UserId == r.StudentId))
                .OrderByDescending(r => r.UploadedAt)
                .ToListAsync();
        }

        public async Task<ResourceEntity?> GetByIdAsync(string id)
        {
            return await _context.Resources.FindAsync(id);
        }

        public async Task<bool> DeleteAsync(string id)
        {
            var resource = await _context.Resources.FindAsync(id);
            if (resource == null) return false;

            _context.Resources.Remove(resource);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task IncrementDownloadCountAsync(string id)
        {
            var resource = await _context.Resources.FindAsync(id);
            if (resource != null)
            {
                resource.DownloadCount++;
                await _context.SaveChangesAsync();
            }
        }
    }
}
