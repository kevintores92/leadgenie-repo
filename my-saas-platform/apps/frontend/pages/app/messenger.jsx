import React from 'react';
import fs from 'fs';
import path from 'path';
import ContactSidebar from '../../features/messenger/ContactSidebar.jsx';
import ConversationList from '../../features/messenger/ConversationList.jsx';
import { ConversationProvider } from '../../features/messenger/ConversationProvider.jsx';

export default function Messenger({ seed }) {
  return (
    <ConversationProvider initialData={seed}>
      <div className="flex h-full w-full mx-0">
        <div className="flex-auto basis-[70%] min-w-[36rem]">
          <ConversationList />
        </div>
        <div className="flex-none basis-[30%]">
          <ContactSidebar />
        </div>
      </div>
    </ConversationProvider>
  );
}

export async function getServerSideProps() {
  try {
    const file = path.resolve(process.cwd(), 'apps/frontend/public/messenger-seed.json');
    const raw = fs.readFileSync(file, 'utf-8');
    const json = JSON.parse(raw);
    return { props: { seed: json } };
  } catch (e) {
    return { props: { seed: null } };
  }
}
