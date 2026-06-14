<?php

namespace App\Support;

/**
 * bcmath 兼容数学运算类
 * 优先使用 bcmath 扩展（精确计算），扩展不可用时降级到普通浮点 + round 模拟
 * 所有方法均返回字符串，避免浮点数精度问题
 */
class BcMath
{
    private static $hasBcMath = null;

    public static function hasBcMath(): bool
    {
        if (self::$hasBcMath === null) {
            self::$hasBcMath = extension_loaded('bcmath')
                && function_exists('bcadd')
                && function_exists('bcsub')
                && function_exists('bcmul')
                && function_exists('bcdiv')
                && function_exists('bccomp');
        }
        return self::$hasBcMath;
    }

    /**
     * 加法
     */
    public static function add(string $leftOperand, string $rightOperand, int $scale = 2): string
    {
        if (self::hasBcMath()) {
            return bcadd($leftOperand, $rightOperand, $scale);
        }
        $result = (float) $leftOperand + (float) $rightOperand;
        return self::format($result, $scale);
    }

    /**
     * 减法
     */
    public static function sub(string $leftOperand, string $rightOperand, int $scale = 2): string
    {
        if (self::hasBcMath()) {
            return bcsub($leftOperand, $rightOperand, $scale);
        }
        $result = (float) $leftOperand - (float) $rightOperand;
        return self::format($result, $scale);
    }

    /**
     * 乘法
     */
    public static function mul(string $leftOperand, string $rightOperand, int $scale = 2): string
    {
        if (self::hasBcMath()) {
            return bcmul($leftOperand, $rightOperand, $scale);
        }
        $result = (float) $leftOperand * (float) $rightOperand;
        return self::format($result, $scale);
    }

    /**
     * 除法
     */
    public static function div(string $leftOperand, string $rightOperand, int $scale = 2): string
    {
        if ((float) $rightOperand == 0) {
            return '0';
        }
        if (self::hasBcMath()) {
            return bcdiv($leftOperand, $rightOperand, $scale);
        }
        $result = (float) $leftOperand / (float) $rightOperand;
        return self::format($result, $scale);
    }

    /**
     * 比较
     * 返回 -1: 左<右, 0: 相等, 1: 左>右
     */
    public static function comp(string $leftOperand, string $rightOperand, int $scale = 2): int
    {
        if (self::hasBcMath()) {
            return bccomp($leftOperand, $rightOperand, $scale);
        }
        $left = round((float) $leftOperand, $scale);
        $right = round((float) $rightOperand, $scale);
        if ($left == $right) return 0;
        return $left > $right ? 1 : -1;
    }

    /**
     * 向下取整到指定小数位（舍去法，消费者有利）
     */
    public static function floor(string $value, int $scale = 2): string
    {
        if ($scale < 0) $scale = 0;
        if (self::hasBcMath()) {
            $pos = strpos($value, '.');
            if ($pos === false) {
                return self::format((float) $value, $scale);
            }
            $intPart = substr($value, 0, $pos);
            $fracPart = substr($value, $pos + 1);
            if ($scale === 0) {
                return $intPart;
            }
            if (strlen($fracPart) <= $scale) {
                $fracPart = str_pad($fracPart, $scale, '0');
            } else {
                $fracPart = substr($fracPart, 0, $scale);
            }
            return $intPart . '.' . $fracPart;
        }
        $pow = pow(10, $scale);
        $result = floor((float) $value * $pow) / $pow;
        return self::format($result, $scale);
    }

    /**
     * 格式化数值为指定小数位的字符串
     */
    public static function format($value, int $scale = 2): string
    {
        return number_format((float) $value, $scale, '.', '');
    }
}
