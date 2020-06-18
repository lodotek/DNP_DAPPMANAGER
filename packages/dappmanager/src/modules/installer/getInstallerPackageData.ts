import deepmerge from "deepmerge";
import * as getPath from "../../utils/getPath";
import orderInstallPackages from "./orderInstallPackages";
import { UserSettingsAllDnps } from "../../types";
import { PackageRelease, InstallPackageData } from "../../types";
import { ComposeEditor, ComposeFileEditor } from "../compose/editor";

export function getInstallerPackagesData({
  releases,
  userSettings,
  currentVersion,
  reqName
}: {
  releases: PackageRelease[];
  userSettings: UserSettingsAllDnps;
  currentVersion: { [name: string]: string | undefined };
  reqName: string;
}): InstallPackageData[] {
  const packagesDataUnordered = releases.map(release =>
    getInstallerPackageData(release, userSettings, currentVersion[release.name])
  );
  return orderInstallPackages(packagesDataUnordered, reqName);
}

/**
 * Receives a release and returns all the information and instructions
 * for the installer to process it.
 * This step is isolated to be a pure function and ease its testing
 * [PURE] Function
 */
function getInstallerPackageData(
  release: PackageRelease,
  userSettings: UserSettingsAllDnps,
  currentVersion: string | undefined
): InstallPackageData {
  const { name, semVersion, isCore, imageFile } = release;

  // Compute paths
  const composePath = getPath.dockerCompose(name, isCore);
  const composeBackupPath = getPath.backupPath(composePath);
  const manifestPath = getPath.manifest(name, isCore);
  const manifestBackupPath = getPath.backupPath(manifestPath);
  // Prepend the hash to the version to make image files unique
  // Necessary for the image download cache to re-download different
  // images for the same semantic version
  const versionWithHash = `${semVersion}-${imageFile.hash}`;
  const imagePath = getPath.image(name, versionWithHash, isCore);

  // If composePath does not exist, or is invalid: returns {}
  const prevUserSet = ComposeFileEditor.getUserSettingsIfExist(name, isCore);

  // Append to compose
  const compose = new ComposeEditor(release.compose);
  compose.applyUserSettings(deepmerge(prevUserSet, userSettings));

  return {
    ...release,
    isUpdate: Boolean(currentVersion),
    // Paths
    composePath,
    composeBackupPath,
    manifestPath,
    manifestBackupPath,
    imagePath,
    // Data to write
    compose: compose.output(),
    // User settings to be applied by the installer
    fileUploads: (userSettings[name] || {}).fileUploads
  };
}