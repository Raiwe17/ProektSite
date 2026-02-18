# Инструкция по деплою на GitHub Pages

## Шаги для деплоя сайта в репозиторий ProektSite

### 1. Подключение к репозиторию ProektSite

Если репозиторий ProektSite еще не создан на GitHub:
- Зайдите на https://github.com
- Создайте новый репозиторий с именем `ProektSite`
- НЕ добавляйте README, .gitignore или лицензию (они уже есть в проекте)

Затем выполните команды:

```bash
# Удалить текущий remote (если нужно)
git remote remove origin

# Добавить новый remote для ProektSite
# Замените YOUR_USERNAME на ваш GitHub username
git remote add origin https://github.com/YOUR_USERNAME/ProektSite.git

# Или если используете SSH:
git remote add origin git@github.com:YOUR_USERNAME/ProektSite.git
```

### 2. Подготовка проекта

```bash
# Убедитесь, что все зависимости установлены
npm install

# Соберите проект локально (для проверки)
npm run build
```

### 3. Коммит и пуш в репозиторий

```bash
# Добавить все файлы
git add .

# Создать коммит
git commit -m "Initial commit: FlowBuilder project"

# Отправить в репозиторий ProektSite
git push -u origin main
```

### 4. Включение GitHub Pages

После того как код будет залит в репозиторий:

1. Зайдите в репозиторий ProektSite на GitHub
2. Перейдите в **Settings** → **Pages**
3. В разделе **Source** выберите:
   - **Source**: `GitHub Actions`
4. Сохраните изменения

### 5. Автоматический деплой

GitHub Actions автоматически запустит workflow при каждом push в ветку `main`.

После успешного деплоя сайт будет доступен по адресу:
```
https://YOUR_USERNAME.github.io/ProektSite/
```

### Проверка статуса деплоя

1. Зайдите в репозиторий на GitHub
2. Перейдите во вкладку **Actions**
3. Там вы увидите статус последнего деплоя

### Если что-то пошло не так

- Проверьте логи в разделе **Actions**
- Убедитесь, что в Settings → Pages выбран источник **GitHub Actions**
- Проверьте, что workflow файл `.github/workflows/deploy.yml` находится в репозитории

## Локальная проверка перед деплоем

Чтобы проверить, как сайт будет выглядеть на GitHub Pages локально:

```bash
# Собрать с правильным base путем
$env:VITE_BASE_PATH="/ProektSite/"; npm run build

# Запустить preview
npm run preview
```

Сайт будет доступен по адресу http://localhost:4173/ProektSite/
