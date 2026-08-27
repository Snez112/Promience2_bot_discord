import { describe, it, expect, vi } from 'vitest';
import { handleInteraction } from '../src/handlers/interactionHandler.js';

describe('handleInteraction', () => {
  it('should handle SlashCommand /server status successfully', async () => {
    const mockInteraction = {
      isChatInputCommand: () => true,
      isButton: () => false,
      commandName: 'server',
      options: {
        getSubcommand: () => 'status',
      },
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
      reply: vi.fn().mockResolvedValue(undefined),
      followUp: vi.fn().mockResolvedValue(undefined),
      deferred: false,
      replied: false,
    };

    const mockServerService = {
      getServerStatus: vi.fn().mockResolvedValue({
        state: 'running',
        cpu: '15.0%',
        memory: '1 GiB / 2 GiB',
        disk: '5 GiB / 10 GiB',
        players: '3 / 20',
      }),
    };

    await handleInteraction(mockInteraction, mockServerService);

    expect(mockInteraction.deferReply).toHaveBeenCalled();
    expect(mockServerService.getServerStatus).toHaveBeenCalled();
    expect(mockInteraction.followUp).toHaveBeenCalled();
  });

  it('should handle already acknowledged interaction gracefully without crashing when deferReply fails', async () => {
    const error40060 = new Error('Interaction has already been acknowledged.');
    error40060.code = 40060;

    const mockInteraction = {
      isChatInputCommand: () => true,
      isButton: () => false,
      commandName: 'server',
      options: {
        getSubcommand: () => 'status',
      },
      deferReply: vi.fn().mockRejectedValue(error40060),
      editReply: vi.fn().mockResolvedValue(undefined),
      reply: vi.fn().mockRejectedValue(error40060),
      followUp: vi.fn().mockResolvedValue(undefined),
      deferred: true, // Marked as acknowledged/deferred by Discord
      replied: false,
    };

    const mockServerService = {
      getServerStatus: vi.fn().mockResolvedValue({}),
    };

    // Should not throw unhandled exception
    await expect(handleInteraction(mockInteraction, mockServerService)).resolves.not.toThrow();
  });

  it('should reject /server setlog if user ID is not 645943983562031145', async () => {
    const mockInteraction = {
      isChatInputCommand: () => true,
      isButton: () => false,
      commandName: 'server',
      guildId: 'guild_test_1',
      user: { id: 'other_user_123', tag: 'OtherUser#0001' },
      options: {
        getSubcommand: () => 'setlog',
        getChannel: () => ({ id: 'ch_999' }),
      },
      reply: vi.fn().mockResolvedValue(undefined),
      deferred: false,
      replied: false,
    };

    await handleInteraction(mockInteraction, {});

    expect(mockInteraction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('Bạn không có quyền thực hiện lệnh này'),
        flags: expect.anything(),
      })
    );
  });

  it('should allow /server setlog for user ID 645943983562031145 and respond ephemerally', async () => {
    const mockInteraction = {
      isChatInputCommand: () => true,
      isButton: () => false,
      commandName: 'server',
      guildId: 'guild_test_1',
      user: { id: '645943983562031145', tag: 'AuthorizedUser#0001' },
      options: {
        getSubcommand: () => 'setlog',
        getChannel: () => ({ id: 'ch_888', toString: () => '<#ch_888>' }),
      },
      reply: vi.fn().mockResolvedValue(undefined),
      deferred: false,
      replied: false,
    };

    await handleInteraction(mockInteraction, {});

    expect(mockInteraction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('Đã cài đặt kênh nhận thông báo log Minecraft'),
        flags: expect.anything(),
      })
    );
  });
});
