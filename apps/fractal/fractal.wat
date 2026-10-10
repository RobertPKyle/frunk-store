;; Mandelbrot renderer. Computes two pixels at a time with f64x2 SIMD and
;; writes RGBA straight into memory. Several workers share one memory and
;; each renders every `ystep`-th row starting at `y0`.
;;
;; Memory layout:
;;   [0, 16 MiB)          output pixels, RGBA, row-major, w*h*4 bytes
;;   [16 MiB, +1 KiB)     palette, 256 RGBA entries, written by JS
(module
  (import "env" "mem" (memory 257 257 shared))
  (global $PAL i32 (i32.const 16777216))

  (func $color (param $n i32) (param $max i32) (result i32)
    (if (result i32) (i32.ge_s (local.get $n) (local.get $max))
      (then (i32.const 0xff000000))
      (else
        (i32.load
          (i32.add (global.get $PAL)
            (i32.shl (i32.and (local.get $n) (i32.const 255)) (i32.const 2)))))))

  (func (export "render")
    (param $y0 i32) (param $ystep i32) (param $w i32) (param $h i32)
    (param $cx f64) (param $cy f64) (param $scale f64) (param $maxIter i32)
    (local $y i32) (local $x i32) (local $i i32) (local $ptr i32)
    (local $halfw f64) (local $halfh f64) (local $cr0 f64)
    (local $cre v128) (local $cim v128) (local $zr v128) (local $zi v128)
    (local $zr2 v128) (local $zi2 v128) (local $mask v128) (local $cnt v128)
    (local $four v128)

    (local.set $four (f64x2.splat (f64.const 4)))
    (local.set $halfw (f64.mul (f64.convert_i32_s (local.get $w)) (f64.const 0.5)))
    (local.set $halfh (f64.mul (f64.convert_i32_s (local.get $h)) (f64.const 0.5)))
    (local.set $y (local.get $y0))

    (block $ydone
      (loop $yloop
        (br_if $ydone (i32.ge_s (local.get $y) (local.get $h)))
        (local.set $cim
          (f64x2.splat
            (f64.add (local.get $cy)
              (f64.mul (f64.sub (f64.convert_i32_s (local.get $y)) (local.get $halfh)) (local.get $scale)))))
        (local.set $x (i32.const 0))

        (block $xdone
          (loop $xloop
            (br_if $xdone (i32.ge_s (local.get $x) (local.get $w)))
            (local.set $cr0
              (f64.add (local.get $cx)
                (f64.mul (f64.sub (f64.convert_i32_s (local.get $x)) (local.get $halfw)) (local.get $scale))))
            (local.set $cre
              (f64x2.replace_lane 1 (f64x2.splat (local.get $cr0)) (f64.add (local.get $cr0) (local.get $scale))))
            (local.set $zr (v128.const i64x2 0 0))
            (local.set $zi (v128.const i64x2 0 0))
            (local.set $cnt (v128.const i64x2 0 0))
            (local.set $i (i32.const 0))

            ;; Escaped lanes drift to inf/NaN; NaN <= 4 is false, so their
            ;; mask stays clear and their count stops growing.
            (block $idone
              (loop $iloop
                (br_if $idone (i32.ge_s (local.get $i) (local.get $maxIter)))
                (local.set $zr2 (f64x2.mul (local.get $zr) (local.get $zr)))
                (local.set $zi2 (f64x2.mul (local.get $zi) (local.get $zi)))
                (local.set $mask (f64x2.le (f64x2.add (local.get $zr2) (local.get $zi2)) (local.get $four)))
                (br_if $idone (i32.eqz (v128.any_true (local.get $mask))))
                ;; mask lanes are -1 where still bounded
                (local.set $cnt (i64x2.sub (local.get $cnt) (local.get $mask)))
                (local.set $zi
                  (f64x2.add (f64x2.mul (f64x2.add (local.get $zr) (local.get $zr)) (local.get $zi)) (local.get $cim)))
                (local.set $zr (f64x2.add (f64x2.sub (local.get $zr2) (local.get $zi2)) (local.get $cre)))
                (local.set $i (i32.add (local.get $i) (i32.const 1)))
                (br $iloop)))

            (local.set $ptr
              (i32.shl (i32.add (i32.mul (local.get $y) (local.get $w)) (local.get $x)) (i32.const 2)))
            (i32.store (local.get $ptr)
              (call $color (i32.wrap_i64 (i64x2.extract_lane 0 (local.get $cnt))) (local.get $maxIter)))
            (if (i32.lt_s (i32.add (local.get $x) (i32.const 1)) (local.get $w))
              (then
                (i32.store (i32.add (local.get $ptr) (i32.const 4))
                  (call $color (i32.wrap_i64 (i64x2.extract_lane 1 (local.get $cnt))) (local.get $maxIter)))))

            (local.set $x (i32.add (local.get $x) (i32.const 2)))
            (br $xloop)))

        (local.set $y (i32.add (local.get $y) (local.get $ystep)))
        (br $yloop))))
)
