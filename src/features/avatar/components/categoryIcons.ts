import React from 'react';
import {
  Cat,
  Crown,
  Eye,
  Footprints,
  Image,
  Shirt,
  Smile,
  Sun,
  Sword,
  User,
  type LucideIcon,
} from 'lucide-react';
import type { AvatarCategory } from '../types';

export type CategoryIconComponent = React.ComponentType<{ className?: string }>;

/** カスタム生成した透過PNGアイコンを表示するラッパー */
function createCustomIcon(src: string, alt: string): CategoryIconComponent {
  const IconComponent: CategoryIconComponent = ({ className = 'h-3.5 w-3.5' }) =>
    React.createElement('img', {
      src,
      alt,
      draggable: false,
      className: `${className} object-contain inline-block align-middle select-none pointer-events-none brightness-90 contrast-125`,
      loading: 'lazy',
    });
  IconComponent.displayName = `CustomIcon(${alt})`;
  return IconComponent;
}

export const CATEGORY_ICONS: Record<AvatarCategory, CategoryIconComponent> = {
  // 1. 顔・髪
  hair_front: createCustomIcon('/avatar-icons/parent/hair_front.png', '前髪'),
  hair_back: createCustomIcon('/avatar-icons/parent/hair_back.png', '後ろ髪'),
  face_eyes: Eye,
  face_mouth: Smile,
  body: User,

  // 2. お洋服・手足
  tops: Shirt,
  bottoms: createCustomIcon('/avatar-icons/parent/bottoms.png', 'ズボン'),
  shoes: Footprints,
  arm_left: createCustomIcon('/avatar-icons/parent/arm_left.png', '左腕'),
  arm_right: createCustomIcon('/avatar-icons/parent/arm_right.png', '右腕'),
  leg_left: createCustomIcon('/avatar-icons/parent/leg_left.png', '左脚'),
  leg_right: createCustomIcon('/avatar-icons/parent/leg_right.png', '右脚'),

  // 3. 小物・アクセサリ
  hat_glasses: Crown,
  hand_item: Sword,
  pet: Cat,

  // 4. 背景・エフェクト
  background: Image,
  front_effect: createCustomIcon('/avatar-icons/parent/front_effect.png', '前面エフェクト'),
  back_effect: Sun,
};
