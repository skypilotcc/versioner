import { ChangeLevel } from '../constants';
import { PrereleaseVersion } from '../PrereleaseVersion';
import type { PrereleaseVersionRecord } from '../PrereleaseVersion';
import { ReleaseVersion } from '../ReleaseVersion';

describe('PrereleaseVersion class', () => {
  describe('constructor', () => {
    it("new ({ major: 1, 'next') should return a PrereleaseVersion object with version 1.0.0, channel: 'next', iteration: 0", () => {
      const prereleaseVersion = new PrereleaseVersion({ major: 1, channel: 'next' });
      const expectedProps = { major: 1, minor: 0, patch: 0, channel: 'next' };
      expect(prereleaseVersion).toMatchObject(expectedProps);
    });

    it('new with negative version element should throw', () => {
      expect(() => {
        new PrereleaseVersion({ major: -1, channel: 'next' });
      }).toThrow();
    });

    it('new with empty channel should throw', () => {
      expect(() => {
        new PrereleaseVersion({ major: 1, channel: '' });
      }).toThrow();
    });

    it('should be instantiable from a ReleaseVersion without a change', () => {
      const releaseVersion = new ReleaseVersion({ major: 1 });
      const prereleaseVersion = new PrereleaseVersion(releaseVersion, { channel: 'next' });

      /* The core version must increase. So even though no changes are reported here, the patch
       * number should increase from 0 to 1. */
      const expectedVersionRecord = { major: 1, minor: 0, patch: 1, channel: 'next', iteration: 0 };
      expect(prereleaseVersion.versionRecord).toEqual(expectedVersionRecord);
    });

    it('should be instantiable from a ReleaseVersion with a change', () => {
      const releaseVersion = new ReleaseVersion({ major: 1, patch: 1 });

      const prereleaseVersion = new PrereleaseVersion(
        releaseVersion,
        { changeLevel: ChangeLevel.minor, channel: 'next' }
      );

      const expectedVersionRecord = { major: 1, minor: 1, patch: 0, channel: 'next', iteration: 0 };
      expect(prereleaseVersion.versionRecord).toEqual(expectedVersionRecord);
    });

    it('should be instantiable from a PrereleaseVersion without a change', () => {
      const basePrereleaseVersion = new PrereleaseVersion({ major: 1, channel: 'beta' });

      const prereleaseVersion = new PrereleaseVersion(
        basePrereleaseVersion,
        { channel: 'alpha' }
      );

      const expectedVersionRecord = { major: 1, minor: 0, patch: 0, channel: 'alpha', iteration: 0 };
      expect(prereleaseVersion.versionRecord).toEqual(expectedVersionRecord);
    });

    it('should be instantiable from a PrereleaseVersion with a change', () => {
      const basePrereleaseVersion = new PrereleaseVersion(
        { major: 1, patch: 1, channel: 'beta' }
      );

      const prereleaseVersion = new PrereleaseVersion(
        basePrereleaseVersion,
        { changeLevel: ChangeLevel.minor, channel: 'alpha' }
      );

      const expectedLiteral = { major: 1, minor: 1, patch: 0, channel: 'alpha', iteration: 0 };
      expect(prereleaseVersion.versionRecord).toEqual(expectedLiteral);
    });

    it('should be instantiable from prerelease version strings', () => {
      const versionStrings = ['1.1.0-alpha.10', 'v1.1.0-alpha.10'];

      versionStrings.forEach((versionString) => {
        const prereleaseVersionRecord = new PrereleaseVersion(versionString).versionRecord;

        const expectedLiteral = ({ major: 1, minor: 1, patch: 0, channel: 'alpha', iteration: 10 });
        expect(prereleaseVersionRecord).toEqual(expectedLiteral);
      });
    });
  });

  describe('representations', () => {
    it('versionString should return a string in the format X.X.X-channel.X', () => {
      const versionString = new PrereleaseVersion({ major: 1, channel: 'alpha' }).versionString;
      const expectedVersionString = '1.0.0-alpha.0';
      expect(versionString).toBe(expectedVersionString);
    });

    it('versionRecord should return an object literal in the format { major: X, minor: X, patch: X, channel, iteration: X }', () => {
      const versionRecord = new PrereleaseVersion(
        { major: 1, minor: 1, patch: 1, channel: 'beta', iteration: 2 }
      ).versionRecord;
      const expectedVersionRecord = { major: 1, minor: 1, patch: 1, channel: 'beta', iteration: 2 };
      expect(versionRecord).toEqual(expectedVersionRecord);
    });

    it('versionTagName should return a string in the format vX.X.X-channel.X', () => {
      const versionTagName = new PrereleaseVersion({ major: 1, channel: 'beta' }).versionTagName;
      const expectedVersionTagName = 'v1.0.0-beta.0';
      expect(versionTagName).toBe(expectedVersionTagName);
    });

  });

  describe('bumpVersion(:ChangeLevel)', () => {
    it('if changeLevel is less than or equal to the changeLevel so far, should increment the iteration number', () => {
      const prereleaseVersion = new PrereleaseVersion(
        { major: 2, channel: 'next', changeLevel: ChangeLevel.major }
      );

      prereleaseVersion.bump(ChangeLevel.minor);

      const expectedLiteral = { major: 2, minor: 0, patch: 0, iteration: 1 };
      expect(prereleaseVersion.versionRecord).toMatchObject(expectedLiteral);
    });

    it('if changeLevel is greater than the max changeLevel so far, should bump the version number', () => {
      const prereleaseVersion = new PrereleaseVersion(
        { major: 1, minor: 1, channel: 'next', changeLevel: ChangeLevel.minor }
      );

      prereleaseVersion.bump(ChangeLevel.major);

      const expectedLiteral = { major: 2, minor: 0, patch: 0, iteration: 0 };
      expect(prereleaseVersion.versionRecord).toMatchObject(expectedLiteral);
    });

    it('if invoked without a parameter, should increment the iteration number', () => {
      const prereleaseVersion = new PrereleaseVersion({ channel: 'next' });

      prereleaseVersion.bump();

      const expectedLiteral = { major: 0, minor: 0, patch: 0, iteration: 1 };
      expect(prereleaseVersion.versionRecord).toMatchObject(expectedLiteral);
    });
  });

  describe('changeLevelFilterFn(:ReleaseVersionInput, :ChangeLevel, channel:string)', () => {
    const prereleaseVersions: PrereleaseVersion[] = [
      '1.1.1-alpha.0',
      '1.2.1-alpha.0',
      '1.2.2-alpha.0',
      '1.2.2-alpha.1',
      '1.2.2-beta.0',
      '2.0.0-alpha.0',
    ].map((versionString) => new PrereleaseVersion(versionString));
    const targetVersion = new ReleaseVersion('1.2.2');

    it('given release version 1.2.2 and ChangeLevel.major, should match all versions 1.x.x', () => {
      const versionFilter = PrereleaseVersion.changeLevelFilterFn(
        targetVersion,
        ChangeLevel.major,
        'alpha',
      );
      const filtered = prereleaseVersions.filter(versionFilter).map(({ versionString }) => versionString);
      const expected = [
        '1.1.1-alpha.0',
        '1.2.1-alpha.0',
        '1.2.2-alpha.0',
        '1.2.2-alpha.1',
      ];
      expect(filtered).toEqual(expected);
    });

    it('given release version 1.2.2 and ChangeLevel.minor, should match all versions 1.2.x', () => {
      const versionFilter = PrereleaseVersion.changeLevelFilterFn(
        targetVersion,
        ChangeLevel.minor,
        'alpha',
      );

      const filtered = prereleaseVersions
        .filter(versionFilter)
        .map(({ versionString }) => versionString);

      const expected = [
        '1.2.1-alpha.0',
        '1.2.2-alpha.0',
        '1.2.2-alpha.1',
      ];
      expect(filtered).toEqual(expected);
    });

    it('given release version 1.2.2 and ChangeLevel.patch, should match all versions 1.2.2', () => {
      const versionFilter = PrereleaseVersion.changeLevelFilterFn(
        targetVersion,
        ChangeLevel.patch,
        'alpha',
      );

      const filtered = prereleaseVersions
        .filter(versionFilter)
        .map(({ versionString }) => versionString);

      const expected = [
        '1.2.2-alpha.0',
        '1.2.2-alpha.1',
      ];
      expect(filtered).toEqual(expected);
    });

    it('when channel is omitted or empty, should match all channels', () => {
      const versionFilter = PrereleaseVersion.changeLevelFilterFn(targetVersion, ChangeLevel.patch);

      const filtered = prereleaseVersions
        .filter(versionFilter)
        .map(({ versionString }) => versionString);

      const expected = [
        '1.2.2-alpha.0',
        '1.2.2-alpha.1',
        '1.2.2-beta.0',
      ];
      expect(filtered).toEqual(expected);
    });
  });

  describe('computeNextIteration(coreVersion:ReleaseVersion, channel:string, versionStrings:string[)', () => {
    const coreVersion = new ReleaseVersion('1.0.0');
    const channel = 'beta';

    it('when no version strings are given, should return 0', () => {
      const iteration = PrereleaseVersion.computeNextIteration(coreVersion, channel);

      const expectedIteration = 0;
      expect(iteration).toBe(expectedIteration);
    });

    it('when there are no previous releases in the same channel, should return 0', () => {
      const verStrings = ['1.0.0-alpha.1'];

      const iteration = PrereleaseVersion.computeNextIteration(coreVersion, channel, verStrings);

      const expectedIteration = 0;
      expect(iteration).toBe(expectedIteration);
    });

    it("when there are releases in the same channel, should return the same version's highest iteration + 1", () => {
      const verStrings = [
        '1.0.0-beta.1',
        '1.0.0-beta.2', // highest iteration at the same version number
        '2.0.0-beta.5',
      ];

      const iteration = PrereleaseVersion.computeNextIteration(coreVersion, channel, verStrings);

      const expectedIteration = 3; // highest iteration + 1
      expect(iteration).toBe(expectedIteration);
    });
  });

  describe('highestOf(PrereleaseVersionInput[])', () => {
    it('should return the highest of prerelease version strings', () => {
      const versionStrings = [
        '1.0.0-alpha.1', '0.2.0-beta.2', '0.0.3-next.3',
      ];
      const highest = PrereleaseVersion.highestOf(versionStrings);

      expect(highest).toBe('1.0.0-alpha.1');
    });

    it('should return the highest of PreeleaseVersion objects', () => {
      const prereleaseVersions: PrereleaseVersion[] = [
        '1.0.0-alpha.1', '0.2.0-beta.2', '0.0.3-next.3',
      ]
        .map((versionString) => new PrereleaseVersion(versionString));
      const highest = PrereleaseVersion.highestOf(prereleaseVersions);

      expect(highest.versionString).toBe('1.0.0-alpha.1');
    });

    it('should return the highest of object literals', () => {
      const versionInputs = [
        { channel: 'alpha', major: 1 },
        { channel: 'beta', minor: 2 },
        { channel: 'next', patch: 3 }];
      const highest = ReleaseVersion.highestOf(versionInputs);

      expect(highest).toEqual({ channel: 'alpha', major: 1 });
    });
  });

  describe('parseVersionComponents(:string)', () => {
    it("can parse '1.1.1-alpha.0' to an object", () => {
      const versionString = '1.1.1-alpha.0';

      const prereleaseVersionInput = PrereleaseVersion.parseVersionComponents(versionString);

      const expectedInput = { major: 1, minor: 1, patch: 1, channel: 'alpha', iteration: 0 };
      expect(prereleaseVersionInput).toEqual(expectedInput);
    });

    it("can parse 'v1.0.10-beta.1' to an object", () => {
      const versionString = 'v1.0.10-beta.1';

      const prereleaseVersionInput = PrereleaseVersion.parseVersionComponents(versionString);

      const expectedInput = { major: 1, minor: 0, patch: 10, channel: 'beta', iteration: 1 };
      expect(prereleaseVersionInput).toEqual(expectedInput);
    });

    it("cannot parse invalid strings: '1.1', 'v1.1.x', '1.1.0.beta', '1.1.0..1'", () => {
      const versionStrings = ['x1.1.1', '1.1', 'v1.1.x', '1.1.0.beta.1', '1.1.0-beta', '1.1.0..1'];

      versionStrings.forEach((versionString) => {
        expect.assertions(6);
        expect(() => {
          console.log(PrereleaseVersion.parseVersionComponents(versionString));
        }).toThrow();
      });
    });
  });

  describe('sorter(:PrereleaseVersionRecord, :PrereleaseVersionRecord)', () => {
    let versionStrings: string[];
    beforeEach(() => {
      versionStrings = [
        '9.9.9-alpha.9',
        '0.0.2-zeta.1',
        '0.0.10-beta.1',
        '0.0.10-beta.0',
      ];
    });
    const expectedOrder = [
      '0.0.2-zeta.1',
      '0.0.10-beta.0',
      '0.0.10-beta.1',
      '9.9.9-alpha.9',
    ];
    const expectedSortedVersions = expectedOrder
      .map((versionString) => new PrereleaseVersion(versionString));

    it('should sort PrereleaseVersion objects in ascending order', () => {
      const sortedVersions = versionStrings
        .map((versionString) => new PrereleaseVersion(versionString))
        .sort(PrereleaseVersion.sorter);
      expect(sortedVersions).toEqual(expectedSortedVersions);
    });

    it('can sort object literals that have all version components', () => {
      interface VersionRecord extends PrereleaseVersionRecord {
        extraProp: number;
      }
      const sortedVersions = versionStrings
        .map((versionString) => PrereleaseVersion.parseVersionComponents(versionString))
        /* Add an extra property to demonstrate that extra props are OK. */
        .map((versionRecord) => ({ ...versionRecord, extraProp: 0 } as VersionRecord))
        .sort(PrereleaseVersion.sorter);

      sortedVersions.forEach((sortedVersion, index) => {
        expect(sortedVersion).toMatchObject(expectedSortedVersions[index].versionRecord);
      })
    });
  });

  describe('versionFilterFn(:PrereleaseVersionInput, channel:string)', () => {
    const prereleaseVersions: PrereleaseVersion[] = [
      '1.2.1-alpha.0',
      '1.2.2-alpha.0',
      '1.2.2-alpha.1',
      '1.2.2-beta.0',
      '2.2.2-alpha.0',
    ].map((versionString) => new PrereleaseVersion(versionString));
    const targetVersion = new ReleaseVersion('1.2.2');

    it('given release version 1.2.2 and a channel, should match all iterations with that version number', () => {
      const versionFilter = PrereleaseVersion.versionFilterFn(targetVersion, 'alpha');

      const filtered = prereleaseVersions
        .filter(versionFilter)
        .map(({ versionString }) => versionString);

      const expected = [
        '1.2.2-alpha.0',
        '1.2.2-alpha.1',
      ];
      expect(filtered).toEqual(expected);
    });

    it('when channel is omitted or empty, should match all channels', () => {
      const versionFilter = PrereleaseVersion.versionFilterFn(targetVersion);

      const filtered = prereleaseVersions
        .filter(versionFilter)
        .map(({ versionString }) => versionString);

      const expected = [
        '1.2.2-alpha.0',
        '1.2.2-alpha.1',
        '1.2.2-beta.0',
      ];
      expect(filtered).toEqual(expected);
    });
  });

  describe('versionPattern(channel?:string)', () => {
    it('given no channel, should match all prerelease versions', () => {
      const versionStrings = [
        '0.0.0',
        '0.1.1-alpha.0',
        '1.2.3-beta.20',
        'not-a-version',
        '0.0.0-bad',
      ];
      const versionPattern = PrereleaseVersion.versionPattern();
      const filteredStrings = versionStrings
        .filter((versionString) => versionPattern.test(versionString));

      const expected = [
        '0.1.1-alpha.0',
        '1.2.3-beta.20',
      ];
      expect(filteredStrings).toEqual(expected);
    });
  });

  describe('versionPatternFilterFn(channel?:string)', () => {
    it('given no channel, should return a filter that matches all prerelease versions', () => {
      const versionStrings = [
        '0.0.0',
        '0.1.1-alpha.0',
        '1.2.3-beta.20',
        'not-a-version',
        '0.0.0-bad',
      ];
      const filteredStrings = versionStrings
        .filter(PrereleaseVersion.versionPatternFilterFn());

      const expected = [
        '0.1.1-alpha.0',
        '1.2.3-beta.20',
      ];
      expect(filteredStrings).toEqual(expected);
    });

    it('given a channel, should return a filter that matches all versions in that channel', () => {
      const versionStrings = [
        '0.0.0',
        '0.0.0-bad',
        '0.0.0-beta',
        '0.1.1-alpha.0',
        '1.2.3-beta.20',
        '4.5.6-beta.0',
      ];
      const filteredStrings = versionStrings
        .filter(PrereleaseVersion.versionPatternFilterFn('beta'));

      const expected = [
        '1.2.3-beta.20',
        '4.5.6-beta.0',
      ];
      expect(filteredStrings).toEqual(expected);
    });
  });
});
