'use strict';

const aws = require('aws-sdk');
const axios = require('axios');
const { DateTime, Settings } = require('luxon');

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

module.exports = async function storeGithubEvents() {
  const github = axios.create({
    baseURL: `https://api.github.com`,
    headers: {
      Authorization: `token ${process.env.GITHUB_ACCESS_TOKEN}`
    },
    timeout: 60 * 1000,
  });
  const s3 = new aws.S3(); // inherit from the provider.role
  const today = DateTime.local().toISODate(); // 2018-05-03

  // Has a fixed page size of 30 items, if I do more than that in one day then oh well
  // see, https://developer.github.com/v3/activity/events/#list-events-performed-by-a-user
  const { data } = await github.get(`/users/${process.env.GITHUB_USERNAME}/events`);

  const normalizedEvents = data.reduce((accumulator, { type, ...event }) => {
    const eventDefinition = events[type] || noop;
    const normalizedEvent = eventDefinition(event);

    if (DateTime.fromISO(event.created_at).toISODate() !== today || !normalizedEvent) {
      return accumulator; // ignore
    }

    return [...accumulator, normalizedEvent];
  }, []);

  // Write to S3 file
  await s3.putObject({
    ACL: 'public-read',
    Body: JSON.stringify(normalizedEvents),
    Bucket: process.env.S3_BUCKET,
    Key: `${today}.json`,
  }).promise();

  return { today, size: normalizedEvents.length };
}
