<script lang="ts">
  import { demos } from '../lib/content/demos';
  import { categoryColors, demoIcons } from '../lib/content/demoVisuals';
  import { onMount } from 'svelte';

  interface Props {
    baseUrl: string;
    currentSlug?: string;
  }

  let { baseUrl, currentSlug = '' }: Props = $props();

  let isOpen = $state(false);
  let search = $state('');
  let searchInput: HTMLInputElement | undefined = $state();

  let filtered = $derived(
    search.trim() === ''
      ? demos
      : demos.filter((d) => {
          const q = search.toLowerCase();
          return (
            d.title.toLowerCase().includes(q) ||
            d.slug.toLowerCase().includes(q) ||
            d.category.toLowerCase().includes(q) ||
            d.difficulty.toLowerCase().includes(q) ||
            d.apis.some((a) => a.toLowerCase().includes(q))
          );
        })
  );

  function open() {
    isOpen = true;
    search = '';
    requestAnimationFrame(() => searchInput?.focus());
  }

  function close() {
    isOpen = false;
  }

  function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      e.stopPropagation();
      close();
    }
  }

  onMount(() => {
    const handler = () => open();
    window.addEventListener('open-demo-switcher', handler);
    return () => window.removeEventListener('open-demo-switcher', handler);
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="ds-overlay" onclick={handleOverlayClick}>
    <div class="ds-panel">
      <div class="ds-header">
        <span class="ds-label">Switch demo</span>
        <button class="ds-close" onclick={close} aria-label="Close">&times;</button>
      </div>
      <div class="ds-search">
        <svg class="ds-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input
          bind:this={searchInput}
          bind:value={search}
          type="text"
          placeholder="Search demos..."
          class="ds-search-input"
        />
      </div>
      <div class="ds-list">
        {#each filtered as demo (demo.slug)}
          <a
            href={`${baseUrl}demos/${demo.slug}/`}
            class="ds-item"
            class:active={demo.slug === currentSlug}
          >
            <span class="ds-item-icon">{demoIcons[demo.slug] || '🔬'}</span>
            <div class="ds-item-info">
              <span class="ds-item-title">{demo.title}</span>
              <span class="ds-item-meta">
                <span class="ds-item-dot" style="background: {categoryColors[demo.category]}"></span>
                {demo.difficulty}
              </span>
            </div>
          </a>
        {/each}
        {#if filtered.length === 0}
          <div class="ds-empty">No demos match "{search}"</div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .ds-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 60px;
    animation: ds-fadeIn 0.15s ease;
  }

  @keyframes ds-fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .ds-panel {
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    width: 380px;
    max-width: calc(100vw - 32px);
    max-height: 75vh;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: ds-slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes ds-slideIn {
    from { transform: translateY(-10px) scale(0.97); opacity: 0; }
    to { transform: translateY(0) scale(1); opacity: 1; }
  }

  .ds-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
  }

  .ds-label {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
  }

  .ds-close {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
    transition: color var(--transition-fast);
  }
  .ds-close:hover { color: var(--accent); }

  .ds-search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-bottom: 1px solid var(--border);
  }

  .ds-search-icon {
    flex-shrink: 0;
    color: var(--text-muted);
  }

  .ds-search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font-size: 0.88rem;
    font-family: var(--font-body);
    color: var(--text-primary);
    padding: 4px 0;
  }

  .ds-search-input::placeholder {
    color: var(--text-muted);
  }

  .ds-list {
    overflow-y: auto;
    padding: var(--space-xs);
  }

  .ds-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    font-size: 0.85rem;
    color: var(--text-secondary);
    text-decoration: none;
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
  }

  .ds-item:hover {
    background: var(--bg-card);
    color: var(--text-primary);
  }

  .ds-item.active {
    color: var(--accent);
    font-weight: 600;
    background: var(--accent-dim);
  }

  .ds-item-icon {
    flex-shrink: 0;
    font-size: 1rem;
    width: 24px;
    text-align: center;
  }

  .ds-item-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .ds-item-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ds-item-meta {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.68rem;
    color: var(--text-muted);
  }

  .ds-item-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .ds-empty {
    padding: 24px 16px;
    text-align: center;
    font-size: 0.85rem;
    color: var(--text-muted);
  }
</style>
