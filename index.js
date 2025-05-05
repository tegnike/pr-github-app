require('dotenv').config();
const axios = require('axios');

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
  app.log.info("Yay, the app was loaded!");

  app.on("issue_comment.created", async (context) => {
    app.log.info("Issue comment created event received");

    // コメント投稿者を取得
    const commentUser = context.payload.comment.user.login;
    app.log.info({ commentUser }, "Comment created by");

    // 特定のユーザーからのコメントか確認 (環境変数が設定されている場合)
    const targetGitHubUser = process.env.TARGET_GITHUB_USER;
    if (targetGitHubUser && commentUser !== targetGitHubUser) {
      app.log.info(`Comment user (${commentUser}) does not match target user (${targetGitHubUser}), skipping.`);
      return;
    } else if (targetGitHubUser) {
      app.log.info(`Comment user (${commentUser}) matches target user (${targetGitHubUser}), proceeding.`);
    } else {
      app.log.info("TARGET_GITHUB_USER not set, processing comment from any user.");
    }

    // コメント本文を取得
    const commentBody = context.payload.comment.body;
    app.log.debug({ commentBody }, "Comment body");

    // コメント本文が特定のパターンを含むかチェック
    const actionableMatch = commentBody ? commentBody.match(/Actionable comments posted: (\d+)/) : null;
    if (!actionableMatch || !actionableMatch[1]) {
      app.log.info("Comment does not contain 'Actionable comments posted: N', skipping.");
      return;
    }

    const actionableCount = parseInt(actionableMatch[1], 10);
    if (isNaN(actionableCount) || actionableCount <= 0) {
      app.log.info(`Actionable comments count (${actionableMatch[1]}) is not greater than 0, skipping.`);
      return;
    }

    app.log.info(`Found actionable comments count: ${actionableCount}, proceeding.`);

    // コメントがPRに関連しているか確認
    if (!context.payload.issue.pull_request) {
      app.log.info("Comment is not on a pull request, skipping.");
      return;
    }

    // PRの本文を取得
    const issue = await context.octokit.issues.get(context.issue());
    const prBody = issue.data.body;
    app.log.debug({ prBody }, "Pull request body");

    // slack_thread_tsを抽出
    const threadTsMatch = prBody ? prBody.match(/<slack_thread_ts>(.*?)<\/slack_thread_ts>/) : null;
    if (!threadTsMatch || !threadTsMatch[1]) {
      app.log.info("slack_thread_ts not found in PR body, skipping.");
      return;
    }
    const threadTs = threadTsMatch[1];
    app.log.info({ threadTs }, "Found slack_thread_ts");

    // threadTs をフォーマット (XXXXXXXXXX.YYYYYY)
    let formattedTs = threadTs;
    if (formattedTs && /^\\d{16}$/.test(formattedTs)) { // 16桁の数字かチェック
      formattedTs = formattedTs.substring(0, 10) + '.' + formattedTs.substring(10);
      app.log.info({ originalTs: threadTs, formattedTs }, "Formatted slack_thread_ts");
    } else if (formattedTs && formattedTs.includes('.')) {
        app.log.info({ threadTs }, "slack_thread_ts already contains '.', using as is.");
    } else if (formattedTs) {
        // 16桁数字でもなく、ピリオドも含まない場合 (予期せぬ形式)
        app.log.warn({ threadTs }, "Unexpected format for slack_thread_ts, using as is.");
    }
    // formattedTsがnullやundefinedの場合はそのまま (上のチェックでthreadTsMatchがあることは保証されている)

    // コメントのURLを取得
    const commentUrl = context.payload.comment.html_url;
    app.log.info({ commentUrl }, "Comment URL");

    // Slack API情報を環境変数から取得
    const slackToken = process.env.SLACK_BOT_TOKEN;
    const slackChannelId = process.env.SLACK_CHANNEL_ID;
    const slackMentionUserId = process.env.SLACK_MENTION_USER_ID; // Optional

    if (!slackToken || !slackChannelId) {
      app.log.error("SLACK_BOT_TOKEN or SLACK_CHANNEL_ID environment variable is not set.");
      return; // 必須情報がない場合は中断
    }

    // Slackメッセージ本文を作成
    let messageText = `CodeRabbitの指摘事項があれば対応してください。\n${commentUrl}`;
    if (slackMentionUserId) {
      messageText = `<@${slackMentionUserId}> ${messageText}`;
    }

    const slackApiUrl = 'https://slack.com/api/chat.postMessage';
    const payload = {
      channel: slackChannelId,
      text: messageText,
      thread_ts: formattedTs // フォーマット済みのthread_tsを使用
    };

    try {
      app.log.info(`Sending message to Slack channel ${slackChannelId}`);
      const response = await axios.post(slackApiUrl, payload, {
        headers: {
          'Authorization': `Bearer ${slackToken}`,
          'Content-Type': 'application/json; charset=utf-8'
        }
      });

      if (response.data.ok) {
        app.log.info({ ts: response.data.ts }, "Successfully sent message to Slack");
      } else {
        // Slack APIがエラーを返した場合 (HTTPステータスは200でもok: falseの場合がある)
        app.log.error({ error: response.data.error }, "Slack API returned an error");
      }
    } catch (error) {
      // axiosエラー (ネットワークエラーなど)
      app.log.error({ 
        error: error.message, 
        responseStatus: error.response?.status,
        responseData: error.response?.data 
      }, "Failed to send message to Slack API");
    }

  });

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
