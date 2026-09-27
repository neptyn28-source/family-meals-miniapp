const FUNCTION_URL = "https://vwapvcpodwvfzfmtoxhz.supabase.co/functions/v1/telegram-auth";
const tg = window.Telegram?.WebApp;
const statusEl = document.querySelector('#status');
const authCard = document.querySelector('#authCard');
const authText = document.querySelector('#authText');
const retryBtn = document.querySelector('#retryBtn');
const home = document.querySelector('#home');
const hello = document.querySelector('#hello');
const placeholder = document.querySelector('#placeholder');

if (tg) { tg.ready(); tg.expand(); }

async function authenticate(){
  retryBtn.hidden = true;
  statusEl.textContent = 'Подключаем Telegram…';
  authText.textContent = 'Проверяем пользователя через Telegram.';
  const initData = tg?.initData || '';
  if (!initData) {
    statusEl.textContent = 'Открой приложение из Telegram';
    authText.textContent = 'Обычная вкладка браузера не получает Telegram initData. После публикации открывай Mini App кнопкой бота.';
    return;
  }
  try {
    const r = await fetch(FUNCTION_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData})});
    const data = await r.json();
    if(!r.ok || !data.ok) throw new Error(data.error || 'Ошибка авторизации');
    const u=data.telegram_user;
    statusEl.textContent='Telegram подключён';
    hello.textContent=`Привет, ${u.first_name || 'семья'}!`;
    authCard.classList.add('hidden');
    home.classList.remove('hidden');
  } catch(e){
    statusEl.textContent='Не удалось войти';
    authText.textContent=e.message || 'Ошибка авторизации';
    retryBtn.hidden=false;
  }
}

retryBtn.addEventListener('click', authenticate);
document.querySelectorAll('.tile').forEach(btn=>btn.addEventListener('click',()=>{
  const names={inventory:'Остатки',rules:'Правила семьи',week:'Новая неделя',shopping:'Покупки'};
  placeholder.innerHTML=`<h2>${names[btn.dataset.action]}</h2><p>Раздел подключим следующим этапом к Supabase. Сейчас проверяем основу Mini App и безопасный Telegram-вход.</p>`;
  placeholder.classList.remove('hidden');
}));

authenticate();
