//
//  ImageUtil.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/06/25.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//

import Foundation
import UIKit

class ImageUtil {
    
    /** 四角形の画像を生成する */
    static func makeBoxWithColor(color: UIColor, width: CGFloat, height: CGFloat) -> UIImage {
        let rect: CGRect = CGRectMake(0.0, 0.0, width, height)
        UIGraphicsBeginImageContext(rect.size)
        let context: CGContextRef = UIGraphicsGetCurrentContext()!
        
        CGContextSetFillColorWithColor(context, color.CGColor)
        CGContextFillRect(context, rect)
        
        let image: UIImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        
        return image
        
    }
    
}