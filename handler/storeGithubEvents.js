'use strict';

const axios = require('axios');
const { DateTime, Settings } = require('luxon');
const getSecrets = require('./helpers/getSecrets');
const log = require('./helpers/log');
const putObject = require('./helpers/putObject');

Settings.defaultZoneName = 'America/New_York';

// see, types https://developer.github.com/v3/activity/events/types/
const events = {
  // CheckRunEvent
  // CheckSuiteEvent
  // CommitCommentEvent // ignore, PullRequestReviewCommentEvent are better
  // CreateEvent
  // DeleteEvent
  // DeploymentEvent
  // DeploymentStatusEvent
  // DownloadEvent
  // FollowEvent
  // ForkEvent
  // ForkApplyEvent
  // GitHubAppAuthorizationEvent
  // GistEvent // maybe
  // GollumEvent
  // InstallationEvent
  // InstallationRepositoriesEvent
  // IssueCommentEvent
  // IssuesEvent
  // LabelEvent
  // MarketplacePurchaseEvent
  // MemberEvent
  // MembershipEvent
  // MilestoneEvent
  // OrganizationEvent
  // OrgBlockEvent
  // PageBuildEvent
  // ProjectCardEvent
  // ProjectColumnEvent
  // ProjectEvent
  // PublicEvent
  // PullRequestEvent // don't really care, already have PushEvent
  // PullRequestReviewEvent // ???
  PullRequestReviewCommentEvent: (event) => ({
    id: event.id,
    public: event.public,
    repo: event.repo.name,
    time: DateTime.fromISO(event.created_at).toISO(),
    type: 'comment',
    url: event.payload.comment.url
  }),
  PushEvent: (event) => {
    const count = event.payload.size;

    if (count === 0) return;

    return {
      id: event.id,
      count,
      repo: event.repo.name,
      time: DateTime.fromISO(event.created_at).toISO(),
      type: 'push'
    };
  },
  // ReleaseEvent
  // RepositoryEvent
  // RepositoryImportEvent
  // RepositoryVulnerabilityAlertEvent
  // StatusEvent
  // TeamEvent
  // TeamAddEvent
  // WatchEvent
};
const noop = () => (undefined);

module.exports = async function storeGithubEvents({ BUCKET, TODAY = DateTime.local().toISODate() }) {
  const {
    GITHUB_ACCESS_TOKEN,
    GITHUB_USERNAME
  } = await getSecrets('GITHUB_ACCESS_TOKEN', 'GITHUB_USERNAME');

  // Has a fixed page size of 30 items, if I do more than that in one day then oh well
  // see, https://developer.github.com/v3/activity/events/#list-events-performed-by-a-user
  const { data } = await axios({
    url: `https://api.github.com/users/${GITHUB_USERNAME}/events`,
    headers: {
      Authorization: `token ${GITHUB_ACCESS_TOKEN}`
    },
    timeout: 60 * 1000
  });

  // Transform
  const normalizedEvents = data.reduce((accumulator, { type, ...event }) => {
    const eventDefinition = events[type] || noop;
    const normalizedEvent = eventDefinition(event);

    if (DateTime.fromISO(event.created_at).toISODate() !== TODAY || !normalizedEvent) {
      return accumulator; // ignore
    }

    return [...accumulator, normalizedEvent];
  }, []);

  // Load
  await putObject({ bucket: BUCKET, key: `${TODAY}.json`, data: normalizedEvents });

  log({ today: TODAY, size: normalizedEvents.length });
}
