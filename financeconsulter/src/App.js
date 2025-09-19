import React, { useMemo } from 'react';
import { Sidebar, Table, Badge } from '@rewind-ui/core';
import './App.css';

const mockItems = [
  { id: 1, name: 'Invoice #1001', type: 'Transfer', status: 'Open', amount: 249.99 },
  { id: 2, name: 'Invoice #1002', type: 'Scan', status: 'Processing', amount: 129.0 },
  { id: 3, name: 'Invoice #1003', type: 'Transfer', status: 'Done', amount: 79.5 },
  { id: 4, name: 'Invoice #1004', type: 'Scan', status: 'Open', amount: 999.0 },
  { id: 5, name: 'Invoice #1005', type: 'Transfer', status: 'Done', amount: 14.99 },
];

function AccountBadge({ name = 'Basti', email = 'basti@example.com' }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="ml-auto flex items-center gap-3">
      <div className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 shadow-sm">
        <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
          {initials}
        </div>
        <div className="hidden sm:block leading-tight">
          <div className="text-sm font-medium">{name}</div>
          <div className="text-xs text-gray-500">{email}</div>
        </div>
      </div>
    </div>
  );
}

function MobileChapters() {
  const chapters = [
    { label: 'Overview', active: true },
    { label: 'Transactions' },
    { label: 'Scan' },
    { label: 'Settings' },
  ];
  return (
    <aside className="fixed inset-y-0 left-0 w-40 bg-white border-r z-20 md:hidden">
      <div className="px-4 py-3 font-semibold">Sites</div>
      <nav className="flex flex-col">
        {chapters.map((c) => (
          <a
            key={c.label}
            href="#"
            className={`px-4 py-3 text-sm hover:bg-slate-50 ${
              c.active ? 'bg-slate-50 font-medium text-slate-900' : 'text-slate-600'
            }`}
          >
            {c.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}

function App() {
  const total = useMemo(() => mockItems.reduce((s, i) => s + i.amount, 0), []);

  return (
    <div className="relative flex flex-row w-full min-h-screen text-slate-800">
      <MobileChapters />
      <Sidebar color="white" shadow="sm" className="fixed hidden md:block">
        <Sidebar.Head>
          <Sidebar.Head.Title>Finance</Sidebar.Head.Title>
          <Sidebar.Head.Toggle />
        </Sidebar.Head>

        <Sidebar.Nav>
          <Sidebar.Nav.Section>
            <Sidebar.Nav.Section.Item label="Overview" href="#" active />
            <Sidebar.Nav.Section.Item label="Transactions" href="#" />
            <Sidebar.Nav.Section.Item label="Scan" href="#" />
            <Sidebar.Nav.Section.Item label="Settings" href="#" />
          </Sidebar.Nav.Section>
        </Sidebar.Nav>

        <Sidebar.Footer>
          <div className="text-xs text-gray-500">If you read this you're awesome!</div>
        </Sidebar.Footer>
      </Sidebar>

    <main className="flex flex-col w-full ml-40 md:ml-64">
        <header className="flex items-center gap-4 px-6 h-16 border-b bg-white sticky top-0 z-10">
          <span className="font-semibold">Overview</span>
          <div className="hidden md:block text-sm text-gray-500">Total: ${total.toFixed(2)}</div>
      <AccountBadge name="Basti" email="basti@example.com" />
        </header>

        <section className="p-6">
          <Table radius="lg" striped hoverable headerColor="white" borderStyle="dashed">
            <Table.Thead>
              <Table.Tr>
                <Table.Th align="left">Name</Table.Th>
                <Table.Th align="left">Type</Table.Th>
                <Table.Th align="left">Status</Table.Th>
                <Table.Th align="right">Amount</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {mockItems.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>{item.name}</Table.Td>
                  <Table.Td>
                    <Badge color="purple" tone="light">{item.type}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={item.status === 'Done' ? 'green' : item.status === 'Open' ? 'yellow' : 'blue'} tone="outline">
                      {item.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td align="right">${item.amount.toFixed(2)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </section>
      </main>
    </div>
  );
}

export default App;
