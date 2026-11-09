using ClassBooking.API.Data;
using ClassBooking.API.Entities;
using ClassBooking.API.Models;
using Microsoft.EntityFrameworkCore;

namespace ClassBooking.API.Repositories
{
    public interface IMessageRepository
    {
        Task<bool> IsParticipantAsync(string conversationId, string userId);
        Task<List<ConversationDto>> GetConversationsAsync(string userId);
        Task<List<MessageDto>> GetMessagesAsync(string conversationId);
        Task<MessageDto> SendMessageAsync(string conversationId, string senderId, string senderName, string content);
        Task<ConversationDto> CreateConversationAsync(string userId1, string userName1, string role1, 
            string userId2, string userName2, string role2, string subject);
        Task MarkAsReadAsync(string conversationId, string userId);
    }

    public class MessageRepository : IMessageRepository
    {
        private readonly ClassBookingDbContext _context;

        public MessageRepository(ClassBookingDbContext context)
        {
            _context = context;
        }

        public Task<bool> IsParticipantAsync(string conversationId, string userId) =>
            _context.ConversationParticipants.AnyAsync(p => p.ConversationId == conversationId && p.UserId == userId);

        public async Task<List<ConversationDto>> GetConversationsAsync(string userId)
        {
            var conversations = await _context.ConversationParticipants
                .Where(cp => cp.UserId == userId)
                .Include(cp => cp.Conversation)
                    .ThenInclude(c => c!.Participants)
                .Include(cp => cp.Conversation)
                    .ThenInclude(c => c!.Messages.OrderByDescending(m => m.SentAt).Take(1))
                .Select(cp => cp.Conversation!)
                .OrderByDescending(c => c.UpdatedAt)
                .ToListAsync();

            return conversations.Select(c => new ConversationDto
            {
                Id = c.Id,
                Subject = c.Subject,
                Participants = c.Participants.Select(p => new ParticipantDto
                {
                    UserId = p.UserId,
                    Name = p.UserName,
                    Role = p.UserRole
                }).ToList(),
                LastMessage = c.Messages.FirstOrDefault() != null ? new MessageDto
                {
                    Id = c.Messages.First().Id,
                    SenderId = c.Messages.First().SenderId,
                    SenderName = c.Messages.First().SenderName,
                    Content = c.Messages.First().Content,
                    SentAt = c.Messages.First().SentAt,
                    IsRead = c.Messages.First().IsRead
                } : null,
                UnreadCount = c.Participants.FirstOrDefault(p => p.UserId == userId)?.UnreadCount ?? 0,
                UpdatedAt = c.UpdatedAt
            }).ToList();
        }

        public async Task<List<MessageDto>> GetMessagesAsync(string conversationId)
        {
            if (!await _context.Conversations.AnyAsync(c => c.Id == conversationId)) return new();
            var messages = await _context.Messages
                .Where(m => m.ConversationId == conversationId)
                .OrderBy(m => m.SentAt)
                .ToListAsync();

            return messages.Select(m => new MessageDto
            {
                Id = m.Id,
                SenderId = m.SenderId,
                SenderName = m.SenderName,
                Content = m.Content,
                SentAt = m.SentAt,
                IsRead = m.IsRead
            }).ToList();
        }

        public async Task<MessageDto> SendMessageAsync(string conversationId, string senderId, string senderName, string content)
        {
            var message = new MessageEntity
            {
                Id = Guid.NewGuid().ToString(),
                ConversationId = conversationId,
                SenderId = senderId,
                SenderName = senderName,
                Content = content,
                SentAt = DateTime.UtcNow,
                IsRead = false
            };

            await _context.Messages.AddAsync(message);

            // Update conversation
            var conversation = await _context.Conversations.FindAsync(conversationId);
            if (conversation != null)
            {
                conversation.LastMessageContent = content;
                conversation.LastMessageAt = DateTime.UtcNow;
                conversation.UpdatedAt = DateTime.UtcNow;
            }

            // Increment unread count for other participants
            var participants = await _context.ConversationParticipants
                .Where(cp => cp.ConversationId == conversationId && cp.UserId != senderId)
                .ToListAsync();

            foreach (var participant in participants)
            {
                participant.UnreadCount++;
            }

            await _context.SaveChangesAsync();

            return new MessageDto
            {
                Id = message.Id,
                SenderId = message.SenderId,
                SenderName = message.SenderName,
                Content = message.Content,
                SentAt = message.SentAt,
                IsRead = message.IsRead
            };
        }

        public async Task<ConversationDto> CreateConversationAsync(string userId1, string userName1, string role1,
            string userId2, string userName2, string role2, string subject)
        {
            var conversation = new ConversationEntity
            {
                Id = Guid.NewGuid().ToString(),
                Subject = subject,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _context.Conversations.AddAsync(conversation);

            var participant1 = new ConversationParticipantEntity
            {
                Id = Guid.NewGuid().ToString(),
                ConversationId = conversation.Id,
                UserId = userId1,
                UserName = userName1,
                UserRole = role1,
                JoinedAt = DateTime.UtcNow
            };

            var participant2 = new ConversationParticipantEntity
            {
                Id = Guid.NewGuid().ToString(),
                ConversationId = conversation.Id,
                UserId = userId2,
                UserName = userName2,
                UserRole = role2,
                JoinedAt = DateTime.UtcNow
            };

            await _context.ConversationParticipants.AddRangeAsync(participant1, participant2);
            await _context.SaveChangesAsync();

            return new ConversationDto
            {
                Id = conversation.Id,
                Subject = conversation.Subject,
                Participants = new List<ParticipantDto>
                {
                    new ParticipantDto { UserId = userId1, Name = userName1, Role = role1 },
                    new ParticipantDto { UserId = userId2, Name = userName2, Role = role2 }
                },
                UnreadCount = 0,
                UpdatedAt = conversation.UpdatedAt
            };
        }

        public async Task MarkAsReadAsync(string conversationId, string userId)
        {
            var participant = await _context.ConversationParticipants
                .FirstOrDefaultAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId);

            if (participant != null)
            {
                participant.UnreadCount = 0;
                await _context.SaveChangesAsync();
            }
        }
    }
}
