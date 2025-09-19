import React, { useMemo } from 'react';
import { Sidebar, useSidebar, Button, Table, Badge } from '@rewind-ui/core';
import './App.css';

const mockItems = [
  { id: 1, name: 'Invoice #1001', type: 'Transfer', status: 'Open', amount: 249.99 },
  { id: 2, name: 'Invoice #1002', type: 'Scan', status: 'Processing', amount: 129.0 },
  { id: 3, name: 'Invoice #1003', type: 'Transfer', status: 'Done', amount: 79.5 },
  { id: 4, name: 'Invoice #1004', type: 'Scan', status: 'Open', amount: 999.0 },
  { id: 5, name: 'Invoice #1005', type: 'Transfer', status: 'Done', amount: 14.99 },
];

function HeaderActions() {
  return (
    <div className="ml-auto flex gap-2">
      <Button size="sm" color="blue">Primary</Button>
      <Button size="sm" color="gray" tone="light">Secondary</Button>
    </div>
  );
}

function App() {
  const sidebar = useSidebar();
  const total = useMemo(() => mockItems.reduce((s, i) => s + i.amount, 0), []);

  return (
    <div className="relative flex flex-row w-full min-h-screen text-slate-800">
      <Sidebar color="white" shadow="sm" className="fixed">
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

      <main className="flex flex-col w-full md:ml-64 ml-20">
        <header className="flex items-center gap-4 px-6 h-16 border-b bg-white sticky top-0 z-10">
          <span className="font-semibold">Overview</span>
          <div className="hidden md:block text-sm text-gray-500">Total: ${total.toFixed(2)}</div>
          <HeaderActions />
          <Button className="ml-2 md:hidden" color="white" icon onClick={() => sidebar.toggleMobile()}>
            <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512">
              <path d="M448 96c0-17.7-14.3-32-32-32H32C14.3 64 0 78.3 0 96s14.3 32 32 32H416c17.7 0 32-14.3 32-32zm0 320c0-17.7-14.3-32-32-32H32c-17.7 0-32 14.3-32 32s14.3 32 32 32H416c17.7 0 32-14.3 32-32z" />
              <path className="opacity-50" d="M0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32z" />
            </svg>
          </Button>
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
