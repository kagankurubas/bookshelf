import { describe, it, expect } from 'vitest';
import { repairLibraryIds } from './queuedBookRepair';

const libraries = [
  { id: 'lib-main', isDefault: true },
  { id: 'lib-summer', isDefault: false },
];

describe('repairLibraryIds', () => {
  it('files a book queued without a library into the default library', () => {
    expect(repairLibraryIds([null], libraries)).toEqual(['lib-main']);
    expect(repairLibraryIds([], libraries)).toEqual(['lib-main']);
    expect(repairLibraryIds(undefined, libraries)).toEqual(['lib-main']);
  });

  it('keeps the user\'s own libraries and adds the default once', () => {
    expect(repairLibraryIds(['lib-summer'], libraries)).toEqual(['lib-summer', 'lib-main']);
    expect(repairLibraryIds(['lib-main', 'lib-summer', 'lib-main'], libraries)).toEqual(['lib-main', 'lib-summer']);
  });

  it('drops ids of libraries the user does not have, such as deleted or other users\' ones', () => {
    expect(repairLibraryIds(['lib-deleted', null, 'lib-summer', 'lib-of-someone-else'], libraries))
      .toEqual(['lib-summer', 'lib-main']);
  });

  it('falls back to the first library when none is marked default', () => {
    expect(repairLibraryIds([null], [{ id: 'lib-only', isDefault: false }])).toEqual(['lib-only']);
  });
});
