using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClassBooking.API.Entities
{
    [Table("ReportHistory")]
    public class ReportHistoryEntity
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = "pdf"; // pdf, excel

        [Required]
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

        [Required]
        [MaxLength(50)]
        public string FileSize { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "ready"; // ready, generating, failed

        [Required]
        public string CreatedBy { get; set; } = "Admin";
    }
}
