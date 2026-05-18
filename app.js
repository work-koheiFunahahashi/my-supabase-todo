// 1. Supabaseの接続設定
// ⚠️ ご自身のものに必ず書き換えてください（前後に余計なスペースが入らないよう注意）
const SUPABASE_URL = "https://ltxmekmnhttxtxhlyzsm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0eG1la21uaHR0eHR4aGx5enNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDUyNTcsImV4cCI6MjA5NDMyMTI1N30.UK_G3khgAJxQ74DXde5K_59l-nR-86DPbEqTZuFeQ6s";

// 変数名エラー(すでにある宣言)を回避するため、完全にオリジナルな名前でクライアントを初期化
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

// 2. タスク一覧の取得
async function fetchTodos() {
  errorBanner.style.display = 'none';
  
  const { data: todos, error } = await _todoSupabaseClient
    .from('todos') // ⚠️ ご自身のテーブル名に書き換えてください
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error(error);
    if (error.message.includes('Failed to fetch')) {
      showError("【CORSエラー】ローカルファイルからの通信が拒否されました。手順3に進んでGitHub/Vercelへアップロードしてください。");
    } else {
      showError("エラーが発生しました: " + error.message);
    }
    return;
  }

  todoList.innerHTML = '';
  todos.forEach(todo => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${todo.text}</span>
      <button class="delete-btn" onclick="deleteTodo('${todo.id}')">削除</button>
    `;
    todoList.appendChild(li);
  });
}

// 3. タスクの追加
todoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = todoInput.value.trim();
  if (!text) return;

  const { error } = await _todoSupabaseClient
    .from('todos') // ⚠️ ご自身のテーブル名
    .insert([{ text: text, completed: false }]);

  if (error) {
    showError("追加に失敗しました: " + error.message);
  } else {
    todoInput.value = '';
    fetchTodos();
  }
});

// 4. タスクの削除
window.deleteTodo = async function(id) {
  const { error } = await _todoSupabaseClient
    .from('todos') // ⚠️ ご自身のテーブル名
    .delete()
    .eq('id', id);

  if (error) {
    showError("削除に失敗しました: " + error.message);
  } else {
    fetchTodos();
  }
}

// アプリ起動時に実行
fetchTodos();