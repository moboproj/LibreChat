import { ref } from 'vue';
import { listConversations, getConversation, listMessages } from '../api/conversations';
import { getErrorMessage, getErrorTitle } from '../utils/errors';
import { useFeedback } from './useFeedback';
import { useServerPagination } from './useServerPagination';

export function useConversations() {
  const { showError } = useFeedback();
  const conversations = ref([]);
  const loading = ref(false);
  const detailLoading = ref(false);
  const selectedConversation = ref(null);
  const messages = ref([]);
  const messagesTotal = ref(0);
  const showDetail = ref(false);
  const userFilter = ref('');

  const pagination = useServerPagination({
    defaultPageSize: 10,
    onChange: () => loadConversations(),
  });

  async function loadConversations() {
    loading.value = true;
    try {
      const response = await listConversations({
        page: pagination.page.value,
        limit: pagination.pageSize.value,
        search: pagination.searchDebounced.value,
        user: userFilter.value.trim(),
      });
      conversations.value = response.data.documents || [];
      pagination.applyMeta(response.data);
    } catch (error) {
      showError(getErrorTitle(error, 'Error al cargar conversaciones'), getErrorMessage(error));
    } finally {
      loading.value = false;
    }
  }

  async function openDetail(conversation) {
    showDetail.value = true;
    selectedConversation.value = conversation;
    messages.value = [];
    detailLoading.value = true;
    try {
      const id = conversation.conversationId || conversation._id;
      const [convoRes, messagesRes] = await Promise.all([
        getConversation(id),
        listMessages({ conversationId: conversation.conversationId, page: 1, limit: 100 }),
      ]);
      selectedConversation.value = convoRes.data.document || conversation;
      messages.value = messagesRes.data.documents || [];
      messagesTotal.value = messagesRes.data.total || messages.value.length;
    } catch (error) {
      showError(getErrorTitle(error, 'Error al cargar conversación'), getErrorMessage(error));
    } finally {
      detailLoading.value = false;
    }
  }

  function closeDetail() {
    showDetail.value = false;
    selectedConversation.value = null;
    messages.value = [];
    messagesTotal.value = 0;
  }

  function applyUserFilter() {
    pagination.resetPage();
    return loadConversations();
  }

  return {
    conversations,
    loading,
    detailLoading,
    selectedConversation,
    messages,
    messagesTotal,
    showDetail,
    userFilter,
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    totalPages: pagination.totalPages,
    rangeLabel: pagination.rangeLabel,
    searchQuery: pagination.searchQuery,
    nextPage: pagination.nextPage,
    prevPage: pagination.prevPage,
    setPageSize: pagination.setPageSize,
    loadConversations,
    openDetail,
    closeDetail,
    applyUserFilter,
  };
}
