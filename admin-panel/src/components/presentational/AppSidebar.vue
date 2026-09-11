<template>
  <aside
    class="fixed inset-y-0 left-0 z-40 flex flex-col border-r transition-transform duration-200 md:translate-x-0 md:transition-[width]"
    :class="[
      isRail ? 'md:w-[72px]' : 'md:w-[260px]',
      'w-[260px]',
      mobileOpen ? 'translate-x-0' : '-translate-x-full',
    ]"
    style="background: var(--sidebar-bg); border-color: var(--border)"
  >
    <div
      class="flex h-14 shrink-0 items-center border-b"
      :class="isRail ? 'justify-center px-2' : 'justify-between gap-2 px-3'"
      style="border-color: var(--border)"
    >
      <div
        class="flex min-w-0 items-center"
        :class="isRail ? 'justify-center' : 'gap-2 overflow-hidden'"
      >
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white"
          style="background: var(--accent)"
        >
          LC
        </div>
        <div v-if="!isRail" class="min-w-0">
          <p class="truncate text-sm font-semibold text-[var(--text)]">LibreChat</p>
          <p class="truncate text-[10px] text-[var(--text-muted)]">Admin Panel</p>
        </div>
      </div>

      <button
        v-if="!isRail"
        type="button"
        class="ui-btn-ghost shrink-0 px-2 py-1 md:hidden"
        title="Cerrar menú"
        @click="closeMobile"
      >
        ✕
      </button>
      <button
        v-if="!isRail"
        type="button"
        class="ui-btn-ghost hidden shrink-0 px-2 py-1 md:inline-flex"
        title="Colapsar"
        @click="toggle"
      >
        <span aria-hidden="true">«</span>
      </button>
    </div>

    <button
      v-if="isRail"
      type="button"
      class="ui-btn-ghost mx-auto mt-1 hidden h-8 w-8 items-center justify-center md:inline-flex"
      title="Expandir"
      @click="toggle"
    >
      <span aria-hidden="true">»</span>
    </button>

    <nav class="flex-1 space-y-1 overflow-y-auto p-2">
      <p
        v-if="!isRail"
        class="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]"
      >
        Menú
      </p>
      <router-link
        v-for="item in items"
        :key="item.path"
        :to="item.path"
        class="group flex items-center rounded-lg py-2 text-sm transition"
        :class="[
          isRail ? 'justify-center px-0' : 'gap-3 px-2.5',
          isActive(item.path)
            ? 'bg-[var(--surface)] text-[var(--text)]'
            : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)]',
        ]"
        :title="item.label"
        @click="closeMobile"
      >
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-base"
          :class="isActive(item.path) ? 'bg-white/10' : 'bg-transparent'"
          aria-hidden="true"
        >
          {{ item.icon }}
        </span>
        <span v-if="!isRail" class="truncate">{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="border-t p-2" style="border-color: var(--border)">
      <div
        v-if="user"
        class="mb-2 rounded-lg border p-2"
        :class="isRail ? 'flex justify-center' : ''"
        style="border-color: var(--border); background: rgba(255, 255, 255, 0.03)"
      >
        <div class="flex items-center" :class="isRail ? 'justify-center' : 'gap-2'">
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            style="background: var(--surface-hover); color: var(--text)"
            :title="user.name || user.email || 'Admin'"
          >
            {{ initials }}
          </div>
          <div v-if="!isRail" class="min-w-0">
            <p class="truncate text-xs font-medium text-[var(--text)]">
              {{ user.name || 'Admin' }}
            </p>
            <p class="truncate text-[10px] text-[var(--text-muted)]">{{ user.email }}</p>
          </div>
        </div>
        <p
          v-if="!isRail && user.role"
          class="mt-2 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase"
          style="background: rgba(16, 163, 127, 0.15); color: var(--accent)"
        >
          {{ user.role }}
        </p>
      </div>
      <button
        type="button"
        class="ui-btn-secondary w-full"
        :class="isRail ? 'px-0' : ''"
        title="Cerrar sesión"
        @click="$emit('logout')"
      >
        <span v-if="isRail">⎋</span>
        <span v-else>Cerrar sesión</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useSidebar } from '@/composables/useSidebar';

export interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const props = defineProps<{
  items: NavItem[];
  user: { name?: string; email?: string; role?: string } | null;
}>();

defineEmits<{ logout: [] }>();

const route = useRoute();
const { collapsed, mobileOpen, toggle, closeMobile } = useSidebar();

/** Rail = colapsado en desktop (móvil drawer siempre muestra labels). */
const isRail = computed(() => collapsed.value && !mobileOpen.value);

const initials = computed(() => {
  const name = props.user?.name || props.user?.email || 'A';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
});

function isActive(path: string) {
  if (path === '/') return route.path === '/';
  return route.path === path || route.path.startsWith(`${path}/`);
}
</script>
