import { MockDnp } from "./types";

export const openEthereum: MockDnp = {
  metadata: {
    name: "open-ethereum.dnp.dappnode.eth",
    version: "0.2.6",
    description:
      "Dappnode package responsible for providing the Ethereum blockchain, based on Parity v2.5.8-stable",
    type: "dncore",
    chain: "ethereum",
    upstreamVersion: "v2.5.8-stable",
    author:
      "DAppNode Association <admin@dappnode.io> (https://github.com/dappnode)",
    contributors: [
      "Eduardo Antuña <eduadiez@gmail.com> (https://github.com/eduadiez)"
    ],
    keywords: ["DAppNodeCore", "Parity", "Mainnet", "Ethereum"],
    links: {
      homepage: "https://your-project-homepage-or-docs.io"
    },
    license: "GLP-3.0"
  },

  installedData: {
    version: "0.2.6",
    state: "running",
    ports: [
      {
        host: 30303,
        container: 30303,
        protocol: "TCP"
      },
      {
        host: 30303,
        container: 30303,
        protocol: "UDP"
      }
    ],
    volumes: [
      {
        host: "/var/lib/docker/volumes/paritydnpdappnodeeth_data/_data",
        container: "/app/.parity",
        name: "paritydnpdappnodeeth_data",
        users: ["parity.dnp.dappnode.eth"],
        owner: "parity.dnp.dappnode.eth",
        isOwner: true
      },
      {
        host: "/var/lib/docker/volumes/paritydnpdappnodeeth_geth/_data",
        container: "/root/.ethereum/",
        name: "paritydnpdappnodeeth_geth",
        users: ["parity.dnp.dappnode.eth"],
        owner: "parity.dnp.dappnode.eth",
        isOwner: true
      }
    ],
    canBeFullnode: true
  }
};