import Ember from 'ember';
import { click, find, findAll, currentURL, visit } from 'ember-native-dom-helpers';
import { test } from 'qunit';
import moduleForAcceptance from 'nomad-ui/tests/helpers/module-for-acceptance';

const { $ } = Ember;

let node;

moduleForAcceptance('Acceptance | client detail', {
  beforeEach() {
    server.create('node', 'forceIPv4');
    node = server.db.nodes[0];

    // Related models
    server.create('agent');
    server.create('job', { createAllocations: false });
    server.createList('allocation', 3, { nodeId: node.id });

    visit(`/nodes/${node.id}`);
  },
});

test('/nodes/:id should have a breadrcumb trail linking back to nodes', function(assert) {
  assert.equal(findAll('.breadcrumb')[0].textContent, 'Nodes', 'First breadcrumb says nodes');
  assert.equal(
    findAll('.breadcrumb')[1].textContent,
    node.id.split('-')[0],
    'Second breadcrumb says the node short id'
  );

  click(findAll('.breadcrumb')[0]);
  andThen(() => {
    assert.equal(currentURL(), '/nodes', 'First breadcrumb links back to nodes');
  });
});

test('/nodes/:id should list immediate details for the node in the title', function(assert) {
  assert.ok(find('.title').textContent.includes(node.name), 'Title includes name');
  assert.ok(find('.title').textContent.includes(node.id), 'Title includes id');
  assert.ok(
    findAll(`.title .node-status-light.${node.status}`).length,
    'Title includes status light'
  );
});

test('/nodes/:id should list additional detail for the node below the title', function(assert) {
  assert.equal(
    findAll('.inline-definitions .pair')[0].textContent,
    `Status ${node.status}`,
    'Status is in additional details'
  );
  assert.ok(
    $('.inline-definitions .pair:eq(0) .status-text').hasClass(`node-${node.status}`),
    'Status is decorated with a status class'
  );
  assert.equal(
    findAll('.inline-definitions .pair')[1].textContent,
    `Address ${node.httpAddr}`,
    'Address is in additional detals'
  );
  assert.equal(
    findAll('.inline-definitions .pair')[2].textContent,
    `Datacenter ${node.datacenter}`,
    'Datacenter is in additional details'
  );
});

test('/nodes/:id should list all allocations on the node', function(assert) {
  const allocationsCount = server.db.allocations.where({ nodeId: node.id }).length;
  assert.equal(
    findAll('.allocations tbody tr').length,
    allocationsCount,
    `Allocations table lists all ${allocationsCount} associated allocations`
  );
});

test('each allocation should have high-level details for the allocation', function(assert) {
  const allocationRow = $(findAll('.allocations tbody tr')[0]);
  const allocation = server.db.allocations
    .where({ nodeId: node.id })
    .sortBy('modifyIndex')
    .reverse()[0];

  const allocStats = server.db.clientAllocationStats.find(allocation.id);
  const taskGroup = server.db.taskGroups.findBy({
    name: allocation.taskGroup,
    jobId: allocation.jobId,
  });

  const tasks = taskGroup.taskIds.map(id => server.db.tasks.find(id));

  assert.equal(
    allocationRow
      .find('td:eq(0)')
      .text()
      .trim(),
    allocation.id.split('-')[0],
    'Allocation short ID'
  );
  assert.equal(
    allocationRow
      .find('td:eq(1)')
      .text()
      .trim(),
    allocation.name,
    'Allocation name'
  );
  assert.equal(
    allocationRow
      .find('td:eq(2)')
      .text()
      .trim(),
    allocation.clientStatus,
    'Client status'
  );
  assert.ok(
    allocationRow
      .find('td:eq(3)')
      .text()
      .includes(server.db.jobs.find(allocation.jobId).name),
    'Job name'
  );
  assert.ok(
    allocationRow
      .find('td:eq(3) .is-faded')
      .text()
      .includes(allocation.taskGroup),
    'Task group name'
  );
  assert.equal(
    allocationRow
      .find('td:eq(4)')
      .text()
      .trim(),
    allocStats.resourceUsage.CpuStats.Percent,
    'CPU %'
  );
  assert.equal(
    allocationRow
      .find('td:eq(5)')
      .text()
      .trim(),
    allocStats.resourceUsage.MemoryStats.Cache /
      tasks.reduce((sum, task) => sum + task.Resources.MemoryMB, 0),
    'Memory used'
  );
});

test('each allocation should link to the allocation detail page', function(assert) {
  const allocation = server.db.allocations
    .where({ nodeId: node.id })
    .sortBy('modifyIndex')
    .reverse()[0];

  click($('.allocations tbody tr:eq(0) td:eq(0) a').get(0));

  andThen(() => {
    assert.equal(
      currentURL(),
      `/allocations/${allocation.id}`,
      'Allocation rows link to allocation detail pages'
    );
  });
});

test('each allocation should link to the job the allocation belongs to', function(assert) {
  const allocation = server.db.allocations.where({ nodeId: node.id })[0];
  const job = server.db.jobs.find(allocation.jobId);
  click($('.allocations tbody tr:eq(0) td:eq(3) a').get(0));

  andThen(() => {
    assert.equal(
      currentURL(),
      `/jobs/${job.id}`,
      'Allocation rows link to the job detail page for the allocation'
    );
  });
});

test('/nodes/:id should list all attributes for the node', function(assert) {
  assert.ok(find('.attributes-table'), 'Attributes table is on the page');
});
