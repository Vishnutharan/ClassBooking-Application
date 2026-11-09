using ClassBooking.API.Models;
using ClassBooking.API.Repositories;

namespace ClassBooking.API.Services
{
    public interface IMessageService
    {
        Task<List<ConversationDto>> GetConversationsAsync(string userId);
        Task<List<MessageDto>> GetMessagesAsync(string conversationId, string userId);
        Task<MessageDto> SendMessageAsync(string conversationId, string senderId, string senderName, string content);
        Task<ConversationDto> CreateConversationAsync(string userId1, string userName1, string role1,
            string userId2, string userName2, string role2, string subject);
        Task MarkAsReadAsync(string conversationId, string userId);
    }

    public class MessageService : IMessageService
    {
        private readonly IMessageRepository _messageRepository;

        public MessageService(IMessageRepository messageRepository)
        {
            _messageRepository = messageRepository;
        }

        public async Task<List<ConversationDto>> GetConversationsAsync(string userId)
        {
            return await _messageRepository.GetConversationsAsync(userId);
        }

        public async Task<List<MessageDto>> GetMessagesAsync(string conversationId, string userId)
        {
            if (!await _messageRepository.IsParticipantAsync(conversationId, userId)) throw new UnauthorizedAccessException();
            return await _messageRepository.GetMessagesAsync(conversationId);
        }

        public async Task<MessageDto> SendMessageAsync(string conversationId, string senderId, string senderName, string content)
        {
            if (string.IsNullOrWhiteSpace(content) || content.Length > 4000)
                throw new ArgumentException("Message must contain between 1 and 4000 characters.");
            if (!await _messageRepository.IsParticipantAsync(conversationId, senderId)) throw new UnauthorizedAccessException();
            return await _messageRepository.SendMessageAsync(conversationId, senderId, senderName, content);
        }

        public async Task<ConversationDto> CreateConversationAsync(string userId1, string userName1, string role1,
            string userId2, string userName2, string role2, string subject)
        {
            return await _messageRepository.CreateConversationAsync(userId1, userName1, role1, userId2, userName2, role2, subject);
        }

        public async Task MarkAsReadAsync(string conversationId, string userId)
        {
            if (!await _messageRepository.IsParticipantAsync(conversationId, userId)) throw new UnauthorizedAccessException();
            await _messageRepository.MarkAsReadAsync(conversationId, userId);
        }
    }
}
