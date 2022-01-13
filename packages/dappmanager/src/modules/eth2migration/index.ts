import { exportValidator } from "./export";
import { importValidator } from "./import";
import { packageStartStop, packageRemove, volumeRemove } from "../../calls";
import { getValidatorContainerSpecs, getMigrationParams } from "./utils";
import { eth2migrationParams } from "./params";
import { extendError } from "../../utils/extendError";
import { eth2MigrationRollback } from "./rollback";

export async function eth2Migrate(testnet: boolean): Promise<void> {
  // Get params deppending on the network
  const { network, dnpName, containerName } = getMigrationParams(testnet);

  try {
    // Get container and volume of validator
    const { container, volume } = await getValidatorContainerSpecs(
      dnpName,
      containerName
    );

    // Get mainnet/testnet params
    const signerDnpName =
      network === "mainnet"
        ? eth2migrationParams.mainnet.signerDnpName
        : eth2migrationParams.testnet.signerDnpName;

    // 1. Backup keystores and slashing protection in docker volume
    await exportValidator({ network, containerName, volume, signerDnpName });
    // 2. Stop and remove validator container (no its volumes)
    if (container.running) packageStartStop({ dnpName });
    await packageRemove({ dnpName, deleteVolumes: false });

    try {
      // 3. Import validator: keystores and slashing protection from docker volume to web3signer
      await importValidator({
        containerName,
        signerDnpName,
        volume: volume.name
      });

      // 4. Delete validator docker volume
      await volumeRemove({ name: volume.name });
    } catch (e) {
      // Rollback: install Prysm again with docker volume
      await eth2MigrationRollback();
      throw extendError(e, "Eth2 migration: import failed");
    }
  } catch (e) {
    throw extendError(e, "Eth2 migration failed");
  }
}
