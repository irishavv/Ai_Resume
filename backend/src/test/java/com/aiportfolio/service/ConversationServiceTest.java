package com.aiportfolio.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import com.aiportfolio.config.AppProperties;
import com.aiportfolio.domain.ConversationEntity;
import com.aiportfolio.domain.MessageEntity;
import com.aiportfolio.domain.MessageStatus;
import com.aiportfolio.domain.Role;
import com.aiportfolio.dto.ConversationDto;
import com.aiportfolio.exception.ResourceNotFoundException;
import com.aiportfolio.repository.ConversationRepository;
import com.aiportfolio.repository.MessageRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ConversationServiceTest {

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private MessageRepository messageRepository;

    private ConversationService service;

    @BeforeEach
    void setUp() {
        RuntimeSettings runtimeSettings = new RuntimeSettings(new AppProperties());
        runtimeSettings.setChatHistoryLimit(20);
        service = new ConversationService(conversationRepository, messageRepository, runtimeSettings);
    }

    @Test
    void creationAssignsTheClientId() {
        given(conversationRepository.save(any(ConversationEntity.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        ConversationDto dto = service.createConversation("client-abc", "Hello world");

        ArgumentCaptor<ConversationEntity> captor = ArgumentCaptor.forClass(ConversationEntity.class);
        verify(conversationRepository).save(captor.capture());
        assertThat(captor.getValue().getClientId()).isEqualTo("client-abc");
        assertThat(captor.getValue().getTitle()).isEqualTo("Hello world");
        assertThat(dto.messageCount()).isZero();
    }

    @Test
    void anotherClientsConversationIsReportedAsNotFound() {
        UUID id = UUID.randomUUID();
        given(conversationRepository.findByIdAndClientId(id, "intruder")).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.getConversation(id, "intruder"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void deletingAnOwnedConversationDelegatesToTheRepository() {
        UUID id = UUID.randomUUID();
        ConversationEntity conversation = conversation("owner");
        given(conversationRepository.findByIdAndClientId(id, "owner")).willReturn(Optional.of(conversation));

        service.deleteConversation(id, "owner");

        verify(conversationRepository).delete(conversation);
    }

    @Test
    void clearingMessagesEmptiesTheConversationAndSavesIt() {
        UUID id = UUID.randomUUID();
        ConversationEntity conversation = conversation("owner");
        conversation.getMessages().add(MessageEntity.builder()
                .id(UUID.randomUUID())
                .conversation(conversation)
                .role(Role.USER)
                .content("hi")
                .status(MessageStatus.COMPLETED)
                .createdAt(Instant.now())
                .build());
        given(conversationRepository.findByIdAndClientId(id, "owner")).willReturn(Optional.of(conversation));

        service.clearMessages(id, "owner");

        assertThat(conversation.getMessages()).isEmpty();
        verify(conversationRepository).save(conversation);
    }

    @Test
    void clearingAnotherClientsConversationIsReportedAsNotFound() {
        UUID id = UUID.randomUUID();
        given(conversationRepository.findByIdAndClientId(id, "intruder")).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.clearMessages(id, "intruder"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    private static ConversationEntity conversation(String clientId) {
        Instant now = Instant.now();
        return ConversationEntity.builder()
                .id(UUID.randomUUID())
                .clientId(clientId)
                .title("Title")
                .createdAt(now)
                .updatedAt(now)
                .messages(new ArrayList<>())
                .build();
    }
}
