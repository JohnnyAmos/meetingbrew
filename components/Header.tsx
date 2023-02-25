import Image from 'next/image';
import Link from 'next/link';
import styles from '../styles/components/Header.module.scss';

export default function Header() {
  return (
    <div className={styles.container}>
      <Link href="/">
        <Image src="/img/logo.svg" width="218" height="36" alt="logo.svg" />
      </Link>
      <span style={{ flexGrow: 1 }} />
      <Link className={styles.link} href="/about">About</Link>
      <button>
        <Image src="/icons/add.svg" width="24" height="24" alt="add.svg" />
        New Meeting
      </button>
    </div>
  );
}