using Microsoft.AspNetCore.Diagnostics;
using System.Net;
using System.Text.Json;

namespace ClassBooking.API.Middleware
{
    /// <summary>
    /// Global exception handler middleware for consistent error responses
    /// </summary>
    public class GlobalExceptionHandler
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionHandler> _logger;

        public GlobalExceptionHandler(RequestDelegate next, ILogger<GlobalExceptionHandler> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unhandled exception occurred");
                await HandleExceptionAsync(context, ex);
            }
        }

        private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";
            
            var response = exception switch
            {
                UnauthorizedAccessException => new
                {
                    statusCode = (int)HttpStatusCode.Unauthorized,
                    message = "Unauthorized access",
                    details = "The request could not be completed."
                },
                KeyNotFoundException => new
                {
                    statusCode = (int)HttpStatusCode.NotFound,
                    message = "Resource not found",
                    details = "The request could not be completed."
                },
                ArgumentException => new
                {
                    statusCode = (int)HttpStatusCode.BadRequest,
                    message = "Invalid argument",
                    details = "The request could not be completed."
                },
                InvalidOperationException => new
                {
                    statusCode = (int)HttpStatusCode.BadRequest,
                    message = "Invalid operation",
                    details = "The request could not be completed."
                },
                _ => new
                {
                    statusCode = (int)HttpStatusCode.InternalServerError,
                    message = "An error occurred while processing your request",
                    details = "The server could not complete the request."
                }
            };

            context.Response.StatusCode = response.statusCode;

            var jsonResponse = JsonSerializer.Serialize(response, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            await context.Response.WriteAsync(jsonResponse);
        }
    }

    /// <summary>
    /// Extension method to use the global exception handler
    /// </summary>
    public static class GlobalExceptionHandlerExtensions
    {
        public static IApplicationBuilder UseGlobalExceptionHandler(this IApplicationBuilder app)
        {
            return app.UseMiddleware<GlobalExceptionHandler>();
        }
    }
}
