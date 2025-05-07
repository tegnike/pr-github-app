# PR Comment to Slack Notifier

## 概要

この Probot アプリケーションは、GitHub のプルリクエストに新しいコメントが投稿された際に、指定された Slack スレッドに通知を送信します。

## 機能

-   プルリクエストへの新規コメントを監視します。
-   コメントが投稿されたプルリクエストの本文から、`<slack_thread_ts>...</slack_thread_ts>` タグで囲まれた Slack スレッドのタイムスタンプ (`thread_ts`) を抽出します。
-   抽出された `thread_ts` が存在する場合、その Slack スレッドに以下の情報を含むメッセージを投稿します。
    -   コメントへの直接リンク
    -   設定されていれば、特定の Slack ユーザーへのメンション

### 設定

アプリケーションを実行する前に、以下の環境変数を設定する必要があります。ルートディレクトリに `.env` ファイルを作成して記述してください。

-   `APP_ID`, `PRIVATE_KEY_PATH` (または `PRIVATE_KEY`), `WEBHOOK_SECRET`: GitHub App の設定ページから取得します。
-   `SLACK_BOT_TOKEN`: Slack App の設定ページ (OAuth & Permissions) から取得します。
-   `SLACK_CHANNEL_ID`: 通知先の Slack チャンネル ID。
-   `SLACK_MENTION_USER_ID`: 通知メッセージ内でメンションしたい Slack ユーザーの ID。指定しない場合はメンションされません。

## 開発

このアプリケーションは [Probot](https://probot.github.io/) フレームワークを使用して構築されています。
開発やカスタマイズに関する詳細は、Probot のドキュメントを参照してください。
-   [Probot Docs](https://probot.github.io/docs/)
-   [Probot Development Guide](https://probot.github.io/docs/development/) 