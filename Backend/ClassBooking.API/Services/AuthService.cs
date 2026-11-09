using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BCrypt.Net;
using ClassBooking.API.Models;
using ClassBooking.API.Models.Dto;
using ClassBooking.API.Repositories;
using ClassBooking.API.Entities;
using Microsoft.IdentityModel.Tokens;
using ClassBooking.API.Data;
using Microsoft.EntityFrameworkCore;

namespace ClassBooking.API.Services
{
    public interface IAuthService
    {
        Task<AuthResponse> RegisterAsync(RegisterRequest request);
        Task<AuthResponse> LoginAsync(LoginRequest request);
        Task ChangePasswordAsync(string userId, ChangePasswordRequest request);
        Task DeactivateAccountAsync(string userId, string currentPassword);
    }

    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly ITeacherRepository _teacherRepository;
        private readonly IStudentRepository _studentRepository;
        private readonly IConfiguration _configuration;

        private readonly ClassBookingDbContext _context;

        public AuthService(
            IUserRepository userRepository,
            ITeacherRepository teacherRepository,
            IStudentRepository studentRepository,
            IConfiguration configuration,
            ClassBookingDbContext context)
        {
            _userRepository = userRepository;
            _teacherRepository = teacherRepository;
            _studentRepository = studentRepository;
            _configuration = configuration;
            _context = context;
        }

        public async Task ChangePasswordAsync(string userId, ChangePasswordRequest request)
        {
            var user = await _userRepository.GetByIdAsync(userId) ?? throw new UnauthorizedAccessException("Account not found.");
            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash)) throw new UnauthorizedAccessException("Current password is incorrect.");
            if (BCrypt.Net.BCrypt.Verify(request.NewPassword, user.PasswordHash)) throw new ArgumentException("Choose a new password different from your current password.");
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            await _userRepository.UpdateUserAsync(user);
        }

        public async Task DeactivateAccountAsync(string userId, string currentPassword)
        {
            var user = await _userRepository.GetByIdAsync(userId) ?? throw new UnauthorizedAccessException("Account not found.");
            if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash)) throw new UnauthorizedAccessException("Password is incorrect.");
            if (!await _userRepository.UpdateUserStatusAsync(userId, "Inactive")) throw new ArgumentException("Account could not be deactivated.");
        }

        public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
        {
            if (request.Role != "Student" && request.Role != "Teacher")
                throw new ArgumentException("Registration is available for students and teachers only.");
            request.Email = request.Email.Trim().ToLowerInvariant();
            request.FullName = request.FullName.Trim();
            var strategy = _context.Database.CreateExecutionStrategy();
            
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Check if user exists
                    var existingUser = await _userRepository.GetByEmailAsync(request.Email);
                    if (existingUser != null)
                    {
                        throw new Exception("Email already exists.");
                    }

                    // Hash password
                    string passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

                    // Create user
                    var newUser = new User
                    {
                        Email = request.Email,
                        PasswordHash = passwordHash,
                        FullName = request.FullName,
                        Role = request.Role,
                        PhoneNumber = request.PhoneNumber
                    };

                    string userId = await _userRepository.CreateUserAsync(newUser);
                    newUser.Id = userId;

                    // Create Profile based on Role
                    if (request.Role == "Teacher")
                    {
                        var teacherProfile = new TeacherProfileEntity
                        {
                            UserId = userId,
                            FullName = request.FullName,
                            Email = request.Email,
                            PhoneNumber = request.PhoneNumber ?? "",
                            HourlyRate = 0,
                            ExperienceYears = 0,
                            AverageRating = 0,
                            TotalReviews = 0,
                            TotalClasses = 0,
                            IsAvailable = true, // Default to available
                            VerificationStatus = "Pending",
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        await _teacherRepository.CreateTeacherAsync(teacherProfile);
                    }
                    else if (request.Role == "Student")
                    {
                        var studentProfile = new StudentProfileEntity
                        {
                            UserId = userId,
                            FullName = request.FullName,
                            Email = request.Email,
                            PhoneNumber = request.PhoneNumber ?? "",
                            GradeLevel = "OLevel", // Default
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        await _studentRepository.CreateAsync(studentProfile);
                    }

                    await transaction.CommitAsync();

                    // Generate token
                    string token = GenerateJwtToken(newUser);

                    return new AuthResponse
                    {
                        Token = token,
                        RefreshToken = string.Empty,
                        User = MapToDto(newUser)
                    };
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request)
        {
            var user = await _userRepository.GetByEmailAsync(request.Email.Trim().ToLowerInvariant());
            if (user == null || user.Status != "Active" || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                throw new Exception("Invalid credentials.");
            }

            user.LastLogin = DateTime.UtcNow;
            await _userRepository.UpdateUserAsync(user);
            string token = GenerateJwtToken(user);

            return new AuthResponse
            {
                Token = token,
                RefreshToken = string.Empty,
                User = MapToDto(user)
            };
        }

        private string GenerateJwtToken(User user)
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var key = Encoding.ASCII.GetBytes(jwtSettings["Key"]!);

            var claims = new List<Claim>
            {
                new Claim("userId", user.Id.ToString()),  // Controllers expect "userId"
                new Claim("email", user.Email),
                new Claim("role", user.Role),            // Controllers expect "role"
                new Claim("fullName", user.FullName),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),  // Also add standard claims
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(double.Parse(jwtSettings["ExpireMinutes"]!)),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
                Issuer = jwtSettings["Issuer"],
                Audience = jwtSettings["Audience"]
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        private UserDto MapToDto(User user)
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
