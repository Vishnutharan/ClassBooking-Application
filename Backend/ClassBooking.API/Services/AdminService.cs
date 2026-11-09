using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ClassBooking.API.Entities;
using ClassBooking.API.Repositories;
using ClassBooking.API.Models;
using ClassBooking.API.Models.Dto;
using Microsoft.EntityFrameworkCore;

namespace ClassBooking.API.Services
{
    public interface IAdminService
    {
        Task<List<UserDto>> GetAllUsersAsync();
        Task<SystemStatsDto> GetSystemStatsAsync();
        Task<List<UserDto>> GetUsersByRoleAsync(string role);
        Task<UserDto?> GetUserByIdAsync(string id);
        Task<bool> UpdateUserStatusAsync(string userId, string status);
        Task<bool> DeleteUserAsync(string userId);
        Task<User> UpdateUserAsync(UpdateUserRequest request);
        Task<UserDto> CreateUserAsync(CreateUserRequest request);
        Task<bool> SuspendUserAsync(string userId, string reason);
        Task<bool> ActivateUserAsync(string userId);
        Task<List<UserDto>> SearchUsersAsync(string query);
        Task<DashboardStatsDto> GetDashboardStatsAsync();
        Task<object> GetUserStatsAsync(string period);
        Task<object> GetBookingStatsAsync(string period);
        Task<object> GetRevenueStatsAsync(string period);
        Task<object> GetTeacherPerformanceStatsAsync();
        Task<List<ReviewEntity>> GetAllReviewsAsync();
        Task<ReviewEntity?> UpdateReviewAsync(string id, int rating, string comment);
        Task<bool> DeleteReviewAsync(string id);
        Task<List<ReportHistoryDto>> GetReportHistoryAsync();
        Task<ReportHistoryDto> CreateReportHistoryAsync(string name, string type, string createdBy);
    }

    public class AdminService : IAdminService
    {
        private readonly IUserRepository _userRepository;
        private readonly ITeacherRepository _teacherRepository;
        private readonly IStudentRepository _studentRepository;
        private readonly IBookingRepository _bookingRepository;
        private readonly IFeeRepository _feeRepository;
        private readonly IReportRepository _reportRepository;

        public AdminService(
            IUserRepository userRepository,
            ITeacherRepository teacherRepository,
            IStudentRepository studentRepository,
            IBookingRepository bookingRepository,
            IFeeRepository feeRepository,
            IReportRepository reportRepository)
        {
            _userRepository = userRepository;
            _teacherRepository = teacherRepository;
            _studentRepository = studentRepository;
            _bookingRepository = bookingRepository;
            _feeRepository = feeRepository;
            _reportRepository = reportRepository;
        }

        public async Task<List<UserDto>> GetAllUsersAsync()
        {
            var users = await _userRepository.GetAllUsersAsync();
            return users.Select(MapUserToDto).ToList();
        }

        public async Task<SystemStatsDto> GetSystemStatsAsync()
        {
            var totalUsers = await _userRepository.GetTotalUsersCountAsync();
            var teachers = await _teacherRepository.GetAllTeachersAsync();
            var students = await _studentRepository.GetAllStudentsAsync();
            var allBookings = await _bookingRepository.GetAllAsync();
            
            var activeBookings = allBookings.Count(b => b.Status == "Confirmed");
            var completedBookings = allBookings.Count(b => b.Status == "Completed");

            // Calculate new users this month
            var firstDayOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            var users = await _userRepository.GetAllUsersAsync();
            var newUsersThisMonth = users.Count(u => u.CreatedAt >= firstDayOfMonth);

            // Get total revenue
            var totalRevenue = await _feeRepository.GetTotalRevenueAsync();

            return new SystemStatsDto
            {
                TotalUsers = totalUsers,
                TotalTeachers = teachers.Count,
                TotalStudents = students.Count,
                TotalBookings = allBookings.Count,
                ActiveBookings = activeBookings,
                CompletedBookings = completedBookings,
                TotalRevenue = totalRevenue,
                NewUsersThisMonth = newUsersThisMonth
            };
        }

        public async Task<List<UserDto>> GetUsersByRoleAsync(string role)
        {
            var users = await _userRepository.GetUsersByRoleAsync(role);
            return users.Select(MapUserToDto).ToList();
        }

        public async Task<UserDto?> GetUserByIdAsync(string id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            return user != null ? MapUserToDto(user) : null;
        }

        public async Task<bool> UpdateUserStatusAsync(string userId, string status)
        {
            return await _userRepository.UpdateUserStatusAsync(userId, status);
        }

        public async Task<bool> DeleteUserAsync(string userId)
        {
            return await _userRepository.DeleteUserAsync(userId);
        }

        public async Task<User> UpdateUserAsync(UpdateUserRequest request)
        {
            var user = await _userRepository.GetByIdAsync(request.Id);
            if (user == null)
                throw new Exception("User not found");

            if (!string.IsNullOrEmpty(request.Email))
                user.Email = request.Email;
            if (!string.IsNullOrEmpty(request.FullName))
                user.FullName = request.FullName;
            if (request.ProfilePicture != null)
                user.ProfilePicture = request.ProfilePicture;
            if (request.Bio != null)
                user.Bio = request.Bio;
            if (request.PhoneNumber != null)
                user.PhoneNumber = request.PhoneNumber;

            return await _userRepository.UpdateUserAsync(user);
        }

        public async Task<UserDto> CreateUserAsync(CreateUserRequest request)
        {
            var existing = await _userRepository.GetByEmailAsync(request.Email);
            if (existing != null)
                throw new Exception("Email already registered");

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            var user = new User
            {
                Email = request.Email,
                PasswordHash = passwordHash,
                FullName = request.FullName,
                Role = request.Role,
                PhoneNumber = request.PhoneNumber,
                Status = "Active",
                CreatedAt = DateTime.UtcNow
            };

            await _userRepository.CreateUserAsync(user);
            return MapUserToDto(user);
        }

        public async Task<bool> SuspendUserAsync(string userId, string reason)
        {
            // Reason could be logged; for now only update status
            return await _userRepository.UpdateUserStatusAsync(userId, "Suspended");
        }

        public async Task<bool> ActivateUserAsync(string userId)
        {
            return await _userRepository.UpdateUserStatusAsync(userId, "Active");
        }

        public async Task<List<UserDto>> SearchUsersAsync(string query)
        {
            var users = await _userRepository.GetAllUsersAsync();
            var q = query.ToLowerInvariant();
            return users
                .Where(u => (!string.IsNullOrEmpty(u.Email) && u.Email.ToLower().Contains(q)) ||
                            (!string.IsNullOrEmpty(u.FullName) && u.FullName.ToLower().Contains(q)))
                .Select(MapUserToDto)
                .ToList();
        }

        public async Task<DashboardStatsDto> GetDashboardStatsAsync()
        {
            var totalUsers = await _userRepository.GetTotalUsersCountAsync();
            var teachers = await _teacherRepository.GetAllTeachersAsync();
            var students = await _studentRepository.GetAllStudentsAsync();
            var bookings = await _bookingRepository.GetAllAsync();

            var pending = bookings.Count(b => b.Status == "Pending");
            var confirmed = bookings.Count(b => b.Status == "Confirmed");
            var completed = bookings.Count(b => b.Status == "Completed");
            var totalRevenue = await _feeRepository.GetTotalRevenueAsync();

            return new DashboardStatsDto
            {
                TotalUsers = totalUsers,
                TotalStudents = students.Count,
                TotalTeachers = teachers.Count,
                TotalBookings = bookings.Count,
                PendingBookings = pending,
                CompletedBookings = completed,
                TotalRevenue = totalRevenue,
                AverageRating = teachers.Any() ? teachers.Average(t => t.AverageRating) : 0
            };
        }

        public async Task<object> GetUserStatsAsync(string period)
        {
            var users = await _userRepository.GetAllUsersAsync();
            var grouped = users
                .GroupBy(u => u.Role)
                .Select(g => new { role = g.Key, count = g.Count() })
                .ToList();
            return new { period, data = grouped };
        }

        public async Task<object> GetBookingStatsAsync(string period)
        {
            var bookings = await _bookingRepository.GetAllAsync();
            var grouped = bookings
                .GroupBy(b => b.Status)
                .Select(g => new { status = g.Key, count = g.Count() })
                .ToList();
            return new { period, data = grouped };
        }

        public async Task<object> GetRevenueStatsAsync(string period)
        {
            var total = await _feeRepository.GetTotalRevenueAsync();
            var points = await _feeRepository.GetMonthlyRevenueAsync(6);

            return new
            {
                period,
                total,
                points = points.Select(p => new { label = p.label, value = p.value }).ToList()
            };
        }

        public async Task<object> GetTeacherPerformanceStatsAsync()
        {
            var teachers = await _teacherRepository.GetAllTeachersAsync();
            return teachers.Select(t => new
            {
                teacherId = t.Id,
                name = t.FullName,
                rating = t.AverageRating,
                classes = t.TotalClasses
            });
        }

        public async Task<List<ReviewEntity>> GetAllReviewsAsync()
        {
            return await _teacherRepository.GetAllReviewsAsync();
        }

        public async Task<ReviewEntity?> UpdateReviewAsync(string id, int rating, string comment)
        {
            var review = await _teacherRepository.GetReviewByIdAsync(id);
            if (review == null) return null;

            review.Rating = rating;
            review.Comment = comment;
            return await _teacherRepository.UpdateReviewAsync(review);
        }

        public async Task<bool> DeleteReviewAsync(string id)
        {
            return await _teacherRepository.DeleteReviewAsync(id);
        }

        public async Task<List<ReportHistoryDto>> GetReportHistoryAsync()
        {
            var reports = await _reportRepository.GetAllAsync();
            return reports.Select(r => new ReportHistoryDto
            {
                Id = r.Id,
                Name = r.Name,
                Type = r.Type,
                GeneratedAt = r.GeneratedAt,
                FileSize = r.FileSize,
                Status = r.Status,
                CreatedBy = r.CreatedBy
            }).ToList();
        }

        public async Task<ReportHistoryDto> CreateReportHistoryAsync(string name, string type, string createdBy)
        {
            var report = new ReportHistoryEntity
            {
                Name = name,
                Type = type,
                GeneratedAt = DateTime.UtcNow,
                FileSize = "0 KB", // Placeholder
                Status = "ready",
                CreatedBy = createdBy
            };

            var created = await _reportRepository.CreateAsync(report);
            return new ReportHistoryDto
            {
                Id = created.Id,
                Name = created.Name,
                Type = created.Type,
                GeneratedAt = created.GeneratedAt,
                FileSize = created.FileSize,
                Status = created.Status,
                CreatedBy = created.CreatedBy
            };
        }

        private UserDto MapUserToDto(User user)
        {
            return new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role,
                ProfilePicture = user.ProfilePicture,
                Bio = user.Bio,
                PhoneNumber = user.PhoneNumber,
                Status = user.Status,
                CreatedAt = user.CreatedAt,
                LastLogin = user.LastLogin
            };
        }
    }
}
