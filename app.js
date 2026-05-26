// 1. Supabaseの接続設定
// ⚠️ ご自身のものに必ず書き換えてください
const SUPABASE_URL = "https://ltxmekmnhttxtxhlyzsm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0eG1la21uaHR0eHR4aGx5enNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDUyNTcsImV4cCI6MjA5NDMyMTI1N30.UK_G3khgAJxQ74DXde5K_59l-nR-86DPbEqTZuFeQ6s";

const _todoSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');
const errorBanner = document.getElementById('error-banner');

// エラー表示用関数
function showError(msg) {
  errorBanner.textContent = msg;
  errorBanner.style.display = 'block';
}

// 登録日のフォーマット
function formatDate(isoString) {
  const d = new Date(isoString);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
}

// ======================================================
// 折りたたみ制御
// ======================================================
function applyFolding(li) {
  const taskText = li.querySelector('.task-text');
  const toggleBtn = li.querySelector('.toggle-btn');
  if (!taskText || !toggleBtn) return;

  // 一度 expanded にしてから高さを測る
  taskText.classList.remove('text-collapsed');
  taskText.classList.add('text-expanded');

  const lineHeight = parseFloat(window.getComputedStyle(taskText).lineHeight) || 24;
  const threshold = lineHeight * 3 + 4; // 3行分 + 余裕

  if (taskText.scrollHeight > threshold) {
    // 長いテキスト：折りたたむ
    taskText.classList.remove('text-expanded');
    taskText.classList.add('text-collapsed');
    toggleBtn.style.display = 'inline-flex';
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.innerHTML = '展開<span class="icon">▼</span>';

    toggleBtn.onclick = function () {
      if (taskText.classList.contains('text-collapsed')) {
        taskText.classList.remove('text-collapsed');
        taskText.classList.add('text-expanded');
        toggleBtn.setAttribute('aria-expanded', 'true');
        toggleBtn.innerHTML = '折りたたむ<span class="icon">▲</span>';
      } else {
        taskText.classList.remove('text-expanded');
        taskText.classList.add('text-collapsed');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.innerHTML = '展開<span class="icon">▼</span>';
      }
    };
  } else {
    // 短いテキスト：そのまま展開状態
    toggleBtn.style.display = 'none';
  }
}

// ======================================================
// 2. タスク一覧の取得（降順：新しいものが上）
// ======================================================
async function fetchTodos() {
  errorBanner.style.display = 'none';

  const { data: todos, error } = await _todoSupabaseClient
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false }); // ← 降順に変更

  if (error) {
    console.error(error);
    if (error.message.includes('Failed to fetch')) {
      showError("【CORSエラー】ローカルファイルからの通信が拒否されました。GitHub/Vercelへアップロードしてください。");
    } else {
      showError("エラーが発生しました: " + error.message);
    }
    return;
  }

  todoList.innerHTML = '';
  todos.forEach(todo => {
    const li = createTodoItem(todo);
    todoList.appendChild(li);
  });
}

// ======================================================
// <li> 要素の生成
// ======================================================
function createTodoItem(todo) {
  const li = document.createElement('li');
  li.dataset.id = todo.id;

  // テキスト部分
  const taskContent = document.createElement('div');
  taskContent.className = 'task-content';

  // 登録日
  const dateEl = document.createElement('span');
  dateEl.className = 'task-date';
  dateEl.textContent = '登録日：' + formatDate(todo.created_at);

  // タスクテキスト
  const taskText = document.createElement('span');
  taskText.className = 'task-text text-expanded';
  taskText.textContent = todo.text;

  // 展開/折りたたみボタン
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'toggle-btn';
  toggleBtn.style.display = 'none';

  taskContent.appendChild(dateEl);
  taskContent.appendChild(taskText);
  taskContent.appendChild(toggleBtn);

  // ボタンエリア（固定幅）
  const actionBtns = document.createElement('div');
  actionBtns.className = 'action-btns';

  // 更新ボタン
  const editBtn = document.createElement('button');
  editBtn.className = 'edit-btn';
  editBtn.textContent = '更新';
  editBtn.onclick = () => enterEditMode(li, todo);

  // 削除ボタン
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = '削除';
  deleteBtn.onclick = () => deleteTodo(todo.id);

  actionBtns.appendChild(editBtn);
  actionBtns.appendChild(deleteBtn);

  li.appendChild(taskContent);
  li.appendChild(actionBtns);

  // 折りたたみ判定（次フレームで実行して高さを正確に取得）
  requestAnimationFrame(() => applyFolding(li));

  return li;
}

// ======================================================
// 編集モードに切り替える
// ======================================================
function enterEditMode(li, todo) {
  const taskContent = li.querySelector('.task-content');
  const actionBtns = li.querySelector('.action-btns');

  // テキストエリアに切り替え
  const currentText = li.querySelector('.task-text').textContent;
  taskContent.innerHTML = `
    <span class="task-date">登録日：${formatDate(todo.created_at)}</span>
    <textarea class="edit-textarea">${currentText}</textarea>
  `;

  // ボタンを保存・キャンセルに切り替え
  actionBtns.innerHTML = '';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'save-btn';
  saveBtn.textContent = '保存';
  saveBtn.onclick = () => saveTodo(li, todo);

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'cancel-btn';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.onclick = () => {
    // 元の表示に戻す
    const newLi = createTodoItem(todo);
    todoList.replaceChild(newLi, li);
    requestAnimationFrame(() => applyFolding(newLi));
  };

  actionBtns.appendChild(saveBtn);
  actionBtns.appendChild(cancelBtn);
}

// ======================================================
// 3. タスクの追加
// ======================================================
todoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = todoInput.value.trim();
  if (!text) return;

  const { error } = await _todoSupabaseClient
    .from('todos')
    .insert([{ text: text, completed: false }]);

  if (error) {
    showError("追加に失敗しました: " + error.message);
  } else {
    todoInput.value = '';
    fetchTodos();
  }
});

// ======================================================
// 4. タスクの更新（保存）
// ======================================================
async function saveTodo(li, todo) {
  const textarea = li.querySelector('.edit-textarea');
  const newText = textarea.value.trim();
  if (!newText) {
    showError("テキストを入力してください。");
    return;
  }

  const { error } = await _todoSupabaseClient
    .from('todos')
    .update({ text: newText })
    .eq('id', todo.id);

  if (error) {
    showError("更新に失敗しました: " + error.message);
  } else {
    errorBanner.style.display = 'none';
    // 更新後のオブジェクトで再描画
    const updatedTodo = { ...todo, text: newText };
    const newLi = createTodoItem(updatedTodo);
    todoList.replaceChild(newLi, li);
    requestAnimationFrame(() => applyFolding(newLi));
  }
}

// ======================================================
// 5. タスクの削除
// ======================================================
async function deleteTodo(id) {
  const { error } = await _todoSupabaseClient
    .from('todos')
    .delete()
    .eq('id', id);

  if (error) {
    showError("削除に失敗しました: " + error.message);
  } else {
    errorBanner.style.display = 'none';
    fetchTodos();
  }
}

// アプリ起動時に実行
fetchTodos();
