export function toast(message) {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 250);
  }, 2800);
}

export function statusBadge(status) {
  const cls = status?.toLowerCase().includes('approve') ? 'approved' : status?.toLowerCase().includes('reject') ? 'rejected' : 'pending';
  return `<span class="badge ${cls}">${status}</span>`;
}

export function loadingCard(text = 'Loading…') {
  return `<section class="card"><p class="muted">${text}</p></section>`;
}
